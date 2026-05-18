import { Response } from 'express';
import pool from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { calculateDistance } from '../utils/haversine.js';
import { analyzeAttendanceSession } from '../services/insights.service.js';

/**
 * Helper to get current office configuration settings or use defaults
 */
const getOfficeSettings = async () => {
  const result = await pool.query('SELECT * FROM office_settings LIMIT 1');
  if (result.rows.length > 0) {
    return result.rows[0];
  }
  // Safe fallback to default coordinates (Bangalore HQ) if settings row is absent
  return {
    latitude: 12.9715987,
    longitude: 77.5945627,
    radius_meters: 200.00,
    late_threshold_minutes: 15,
  };
};

/**
 * Handle Employee Check-in
 */
export const checkIn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { latitude, longitude } = req.body;
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'Authentication credentials not loaded.' });
    return;
  }

  // 1. Validate coordinates range
  if (
    latitude === undefined ||
    longitude === undefined ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    res.status(400).json({ error: 'Invalid coordinates. Latitude must be -90 to 90, Longitude must be -180 to 180.' });
    return;
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Prevent duplicate check-ins on the same day
    const existingCheckIn = await pool.query(
      'SELECT id FROM attendance WHERE user_id = $1 AND date = $2',
      [user.id, todayStr]
    );

    if (existingCheckIn.rows.length > 0) {
      // Log the failed duplicate punch attempt
      await pool.query(
        `INSERT INTO attendance_logs (user_id, event_type, lat, lng, distance_from_office, accepted, reason)
         VALUES ($1, 'CHECK_IN_FAIL', $2, $3, 0, false, 'Duplicate check-in attempt on the same day')`,
        [user.id, latitude, longitude]
      );
      res.status(400).json({ error: 'You have already checked in today.' });
      return;
    }

    // 3. Fetch office coordinates & validate geofence bounds
    const office = await getOfficeSettings();
    const distance = calculateDistance(latitude, longitude, parseFloat(office.latitude), parseFloat(office.longitude));

    if (distance > parseFloat(office.radius_meters)) {
      // Log failed punch attempt due to being out of geofence bounds
      const reason = `Out of geofence bounds. Distance: ${distance}m, allowed: ${office.radius_meters}m`;
      await pool.query(
        `INSERT INTO attendance_logs (user_id, event_type, lat, lng, distance_from_office, accepted, reason)
         VALUES ($1, 'CHECK_IN_FAIL', $2, $3, $4, false, $5)`,
        [user.id, latitude, longitude, distance, reason]
      );
      res.status(400).json({
        error: `Punch rejected. You are outside the configured geofence radius. (Distance: ${distance}m, Allowed: ${office.radius_meters}m)`,
      });
      return;
    }

    // 4. Time calculations & Tardiness check
    const now = new Date();
    const checkInTimeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const [checkInH, checkInM] = checkInTimeStr.split(':').map(Number);
    const [shiftH, shiftM] = user.shift_start_time.split(':').map(Number);

    // Compute times in minutes since midnight for accurate comparison
    const checkInMinutes = checkInH * 60 + checkInM;
    const shiftMinutes = shiftH * 60 + shiftM;
    const lateThreshold = parseInt(office.late_threshold_minutes);

    const isLate = checkInMinutes > shiftMinutes + lateThreshold;
    const status = isLate ? 'LATE' : 'PRESENT';

    // 5. Insert secure attendance record into Database
    const attendanceResult = await pool.query(
      `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng, is_late, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user.id, todayStr, now, latitude, longitude, isLate, status]
    );

    const attendanceId = attendanceResult.rows[0].id;

    // 6. Register successful log in audit trail
    await pool.query(
      `INSERT INTO attendance_logs (user_id, event_type, lat, lng, distance_from_office, accepted, reason)
       VALUES ($1, 'CHECK_IN_SUCCESS', $2, $3, $4, true, 'Check-in within geofence boundaries')`,
      [user.id, latitude, longitude, distance]
    );

    // 7. Run real-time anomaly analysis on check-in telemetry
    await analyzeAttendanceSession(
      user.id,
      attendanceId,
      latitude,
      longitude,
      now,
      user.shift_start_time
    );

    res.status(201).json({
      message: 'Check-in successful',
      data: {
        check_in_time: attendanceResult.rows[0].check_in_time,
        distance_from_office: distance,
        is_late: isLate,
        status: status,
      },
    });
  } catch (error) {
    console.error('❌ checkIn controller error:', error);
    res.status(500).json({ error: 'Internal server error occurred during geofence validation check-in.' });
  }
};

/**
 * Handle Employee Check-out
 */
export const checkOut = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { latitude, longitude } = req.body;
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'Authentication credentials not loaded.' });
    return;
  }

  // 1. Validate coordinates range
  if (
    latitude === undefined ||
    longitude === undefined ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    res.status(400).json({ error: 'Invalid coordinates. Latitude must be -90 to 90, Longitude must be -180 to 180.' });
    return;
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Fetch existing daily check-in to enable checkout
    const attendanceRecord = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [user.id, todayStr]
    );

    if (attendanceRecord.rows.length === 0) {
      // Log the failed sequence attempt
      await pool.query(
        `INSERT INTO attendance_logs (user_id, event_type, lat, lng, distance_from_office, accepted, reason)
         VALUES ($1, 'CHECK_OUT_FAIL', $2, $3, 0, false, 'Check-out attempted without a prior check-in')`,
        [user.id, latitude, longitude]
      );
      res.status(400).json({ error: 'No check-in record found for today. You must check in first.' });
      return;
    }

    const attendance = attendanceRecord.rows[0];

    if (attendance.check_out_time) {
      // Log the failed double check-out attempt
      await pool.query(
        `INSERT INTO attendance_logs (user_id, event_type, lat, lng, distance_from_office, accepted, reason)
         VALUES ($1, 'CHECK_OUT_FAIL', $2, $3, 0, false, 'Duplicate check-out attempt on the same day')`,
        [user.id, latitude, longitude]
      );
      res.status(400).json({ error: 'You have already checked out today.' });
      return;
    }

    // 3. Fetch office coordinates & validate geofence bounds
    const office = await getOfficeSettings();
    const distance = calculateDistance(latitude, longitude, parseFloat(office.latitude), parseFloat(office.longitude));

    if (distance > parseFloat(office.radius_meters)) {
      // Log failed punch attempt due to being out of geofence bounds
      const reason = `Out of geofence bounds on check-out. Distance: ${distance}m, allowed: ${office.radius_meters}m`;
      await pool.query(
        `INSERT INTO attendance_logs (user_id, event_type, lat, lng, distance_from_office, accepted, reason)
         VALUES ($1, 'CHECK_OUT_FAIL', $2, $3, $4, false, $5)`,
        [user.id, latitude, longitude, distance, reason]
      );
      res.status(400).json({
        error: `Punch rejected. You are outside the configured geofence radius on check-out. (Distance: ${distance}m, Allowed: ${office.radius_meters}m)`,
      });
      return;
    }

    // 4. Calculate server-side working hours
    const now = new Date();
    const checkInTime = new Date(attendance.check_in_time);
    const diffMs = now.getTime() - checkInTime.getTime();
    const workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // in hours, rounded to 2 decimal places

    // 5. Update attendance record in Database
    const updateResult = await pool.query(
      `UPDATE attendance
       SET check_out_time = $1, check_out_lat = $2, check_out_lng = $3, working_hours = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [now, latitude, longitude, workingHours, attendance.id]
    );

    // 6. Register successful check-out log in audit trail
    await pool.query(
      `INSERT INTO attendance_logs (user_id, event_type, lat, lng, distance_from_office, accepted, reason)
       VALUES ($1, 'CHECK_OUT_SUCCESS', $2, $3, $4, true, 'Check-out within geofence boundaries')`,
      [user.id, latitude, longitude, distance]
    );

    res.status(200).json({
      message: 'Check-out successful',
      data: {
        check_out_time: updateResult.rows[0].check_out_time,
        working_hours: workingHours,
      },
    });
  } catch (error) {
    console.error('❌ checkOut controller error:', error);
    res.status(500).json({ error: 'Internal server error occurred during geofence validation check-out.' });
  }
};

/**
 * Fetch Today's Attendance Status for Logged-In User
 */
export const getTodayStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [user.id, todayStr]
    );

    if (result.rows.length === 0) {
      res.status(200).json({
        hasCheckedIn: false,
        hasCheckedOut: false,
        checkInTime: null,
        checkOutTime: null,
        workingHours: null,
        status: 'ABSENT',
      });
      return;
    }

    const att = result.rows[0];

    res.status(200).json({
      hasCheckedIn: true,
      hasCheckedOut: att.check_out_time !== null,
      checkInTime: att.check_in_time,
      checkOutTime: att.check_out_time,
      workingHours: att.working_hours !== null ? parseFloat(att.working_hours) : null,
      status: att.status,
    });
  } catch (error) {
    console.error('❌ getTodayStatus controller error:', error);
    res.status(500).json({ error: 'Internal server error fetching today status.' });
  }
};

/**
 * Fetch Full Attendance History for Logged-In User
 */
export const getAttendanceHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT 
         a.id, TO_CHAR(a.date, 'YYYY-MM-DD') as date, a.check_in_time, a.check_out_time, a.working_hours, a.status, 
         i.confidence_score, i.confidence_status 
       FROM attendance a
       LEFT JOIN attendance_insights i ON a.id = i.attendance_id
       WHERE a.user_id = $1 
       ORDER BY a.date DESC`,
      [user.id]
    );

    res.status(200).json({
      history: result.rows.map(row => ({
        id: row.id,
        date: row.date,
        checkInTime: row.check_in_time,
        checkOutTime: row.check_out_time,
        workingHours: row.working_hours !== null ? parseFloat(row.working_hours) : null,
        status: row.status,
        confidenceScore: row.confidence_score,
        confidenceStatus: row.confidence_status,
      }))
    });
  } catch (error) {
    console.error('❌ getAttendanceHistory controller error:', error);
    res.status(500).json({ error: 'Internal server error fetching attendance history.' });
  }
};
