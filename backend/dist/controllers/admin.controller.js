"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateAttendance = exports.updateEmployee = exports.createEmployee = exports.getEmployees = exports.getInsightsFeed = exports.getMonthlyReports = exports.getTodayAttendance = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_js_1 = __importDefault(require("../config/database.js"));
/**
 * GET /api/admin/attendance/today
 * Renders the live roster status joined with real-time anomaly scores
 */
const getTodayAttendance = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        // 1. Fetch all employees and their check-in logs joined with AI trust metrics
        const query = `
      SELECT 
        u.id as "userId",
        u.name,
        u.email,
        u.shift_start_time,
        a.id as "attendanceId",
        a.check_in_time as "checkIn",
        a.check_out_time as "checkOut",
        a.working_hours::FLOAT as "workingHours",
        a.is_late as "isLate",
        COALESCE(a.status, 'ABSENT') as status,
        COALESCE(ai.confidence_score, 0) as "confidenceScore",
        COALESCE(ai.confidence_status, '--') as "confidenceStatus"
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id AND a.date = $1
      LEFT JOIN attendance_insights ai ON a.id = ai.attendance_id
      WHERE u.role = 'employee'
      ORDER BY u.name ASC
    `;
        const result = await database_js_1.default.query(query, [todayStr]);
        const records = result.rows.map(r => ({
            ...r,
            confidenceScore: r.status === 'ABSENT' ? 0 : parseInt(r.confidenceScore),
            workingHours: r.workingHours ? parseFloat(r.workingHours) : null
        }));
        // 2. Aggregate statistics
        const totalCount = records.length;
        const present = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
        const late = records.filter(r => r.status === 'LATE').length;
        const absent = records.filter(r => r.status === 'ABSENT').length;
        res.status(200).json({
            summary: {
                totalCount,
                present,
                late,
                absent
            },
            records
        });
    }
    catch (error) {
        console.error('❌ getTodayAttendance controller error:', error);
        res.status(500).json({ error: 'Internal server error pulling daily roster.' });
    }
};
exports.getTodayAttendance = getTodayAttendance;
/**
 * GET /api/admin/reports/monthly
 * Generates structured monthly audit logs with aggregates
 */
const getMonthlyReports = async (req, res) => {
    const { month } = req.query; // format YYYY-MM (e.g. 2026-05)
    if (!month || typeof month !== 'string') {
        res.status(400).json({ error: 'Month parameter is required (format: YYYY-MM)' });
        return;
    }
    try {
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr);
        const monthNum = parseInt(monthStr);
        const startDate = `${year}-${monthStr}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDate = `${year}-${monthStr}-${lastDay < 10 ? `0${lastDay}` : lastDay}`;
        const query = `
      SELECT 
        a.date,
        u.name,
        u.email,
        u.shift_start_time as "shiftStart",
        TO_CHAR(a.check_in_time, 'HH24:MI:SS') as "checkIn",
        TO_CHAR(a.check_out_time, 'HH24:MI:SS') as "checkOut",
        a.status,
        a.working_hours::FLOAT as "workingHours",
        ROUND(COALESCE(al.distance_from_office, 0), 1) as "distanceMeters"
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      LEFT JOIN attendance_logs al ON a.user_id = al.user_id 
        AND al.event_type = 'CHECK_IN_SUCCESS'
        AND al.timestamp::date = a.date
      WHERE a.date >= $1 AND a.date <= $2
      ORDER BY a.date DESC, u.name ASC
    `;
        const result = await database_js_1.default.query(query, [startDate, endDate]);
        const records = result.rows.map(r => ({
            ...r,
            workingHours: r.workingHours ? parseFloat(r.workingHours) : null,
            distanceMeters: parseFloat(r.distanceMeters)
        }));
        // Calculate aggregates
        const total = records.length;
        const present = records.filter(r => r.status !== 'ABSENT').length;
        const late = records.filter(r => r.status === 'LATE').length;
        const hours = records.filter(r => r.workingHours !== null).map(r => r.workingHours);
        const avgH = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
        res.status(200).json({
            stats: {
                avgAttendance: total > 0 ? Math.round((present / total) * 100) : 100,
                lateInstances: late,
                avgHours: Math.round(avgH * 10) / 10,
                avgAccuracy: 98.4
            },
            records
        });
    }
    catch (error) {
        console.error('❌ getMonthlyReports controller error:', error);
        res.status(500).json({ error: 'Internal server error compiling reports.' });
    }
};
exports.getMonthlyReports = getMonthlyReports;
/**
 * GET /api/admin/insights/feed
 * Compiles a rich activity feed showing punch logs, drifts, failures, and threat indexes
 */
const getInsightsFeed = async (req, res) => {
    try {
        // 1. Fetch recent successful check-in sessions with trust insights
        const successQuery = `
      SELECT 
        'SUCCESS' as category,
        u.name,
        u.email,
        ai.confidence_score as "score",
        ai.confidence_status as "status",
        ai.failed_checkin_count as "failedCount",
        a.check_in_time as "timestamp",
        ai.details
      FROM attendance_insights ai
      INNER JOIN attendance a ON ai.attendance_id = a.id
      INNER JOIN users u ON ai.user_id = u.id
      ORDER BY a.check_in_time DESC
      LIMIT 15
    `;
        const successRes = await database_js_1.default.query(successQuery);
        // 2. Fetch recent failed coordinates punch logs
        const failQuery = `
      SELECT 
        'REJECTED' as category,
        u.name,
        u.email,
        0 as "score",
        'Blocked punch attempt' as "status",
        0 as "failedCount",
        al.timestamp,
        al.reason as "details"
      FROM attendance_logs al
      INNER JOIN users u ON al.user_id = u.id
      WHERE al.accepted = false
      ORDER BY al.timestamp DESC
      LIMIT 15
    `;
        const failRes = await database_js_1.default.query(failQuery);
        // 3. Merge and sort chronologically
        const feed = [
            ...successRes.rows.map(r => ({
                ...r,
                score: parseInt(r.score),
                timestamp: new Date(r.timestamp).toISOString()
            })),
            ...failRes.rows.map(r => ({
                ...r,
                timestamp: new Date(r.timestamp).toISOString()
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        res.status(200).json({ feed: feed.slice(0, 20) });
    }
    catch (error) {
        console.error('❌ getInsightsFeed controller error:', error);
        res.status(500).json({ error: 'Internal server error compiles audit feed.' });
    }
};
exports.getInsightsFeed = getInsightsFeed;
/**
 * GET /api/admin/employees
 * List, search, and filter all employees
 */
const getEmployees = async (req, res) => {
    const { search, department, role } = req.query;
    try {
        let query = 'SELECT id, name, email, role, department, shift_start_time, created_at FROM users WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (search && typeof search === 'string' && search.trim() !== '') {
            query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            params.push(`%${search.trim()}%`);
            paramIndex++;
        }
        if (department && typeof department === 'string' && department.trim() !== '') {
            query += ` AND department = $${paramIndex}`;
            params.push(department.trim());
            paramIndex++;
        }
        if (role && typeof role === 'string' && role.trim() !== '') {
            query += ` AND role = $${paramIndex}`;
            params.push(role.trim());
            paramIndex++;
        }
        query += ' ORDER BY name ASC';
        const result = await database_js_1.default.query(query, params);
        res.status(200).json({ employees: result.rows });
    }
    catch (error) {
        console.error('❌ getEmployees error:', error);
        res.status(500).json({ error: 'Internal server error fetching employees registry.' });
    }
};
exports.getEmployees = getEmployees;
/**
 * POST /api/admin/employees
 * Create a new employee account
 */
const createEmployee = async (req, res) => {
    const { name, email, password, role, department, shift_start_time } = req.body;
    if (!name || !email || !password || !role) {
        res.status(400).json({ error: 'Name, email, password, and role are required.' });
        return;
    }
    try {
        // Check duplicate email
        const checkEmail = await database_js_1.default.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (checkEmail.rows.length > 0) {
            res.status(400).json({ error: 'An account with this email already exists.' });
            return;
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const shiftTime = shift_start_time || '09:00:00';
        const dept = department || 'Engineering';
        const insertQuery = `
      INSERT INTO users (name, email, password_hash, role, department, shift_start_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, department, shift_start_time
    `;
        const result = await database_js_1.default.query(insertQuery, [
            name.trim(),
            email.toLowerCase().trim(),
            passwordHash,
            role,
            dept,
            shiftTime
        ]);
        res.status(201).json({
            message: 'Employee account successfully created',
            employee: result.rows[0]
        });
    }
    catch (error) {
        console.error('❌ createEmployee error:', error);
        res.status(500).json({ error: 'Internal server error creating employee account.' });
    }
};
exports.createEmployee = createEmployee;
/**
 * PUT /api/admin/employees/:id
 * Manage/update an employee account
 */
const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const { name, email, role, department, shift_start_time } = req.body;
    if (!name || !email || !role) {
        res.status(400).json({ error: 'Name, email, and role are required.' });
        return;
    }
    try {
        // Check if user exists
        const checkUser = await database_js_1.default.query('SELECT id FROM users WHERE id = $1', [id]);
        if (checkUser.rows.length === 0) {
            res.status(404).json({ error: 'Employee account not found.' });
            return;
        }
        // Check duplicate email for other users
        const checkEmail = await database_js_1.default.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [
            email.toLowerCase().trim(),
            id
        ]);
        if (checkEmail.rows.length > 0) {
            res.status(400).json({ error: 'An account with this email already exists.' });
            return;
        }
        const shiftTime = shift_start_time || '09:00:00';
        const dept = department || 'Engineering';
        const updateQuery = `
      UPDATE users 
      SET name = $1, email = $2, role = $3, department = $4, shift_start_time = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, name, email, role, department, shift_start_time
    `;
        const result = await database_js_1.default.query(updateQuery, [
            name.trim(),
            email.toLowerCase().trim(),
            role,
            dept,
            shiftTime,
            id
        ]);
        res.status(200).json({
            message: 'Employee details updated successfully',
            employee: result.rows[0]
        });
    }
    catch (error) {
        console.error('❌ updateEmployee error:', error);
        res.status(500).json({ error: 'Internal server error updating employee details.' });
    }
};
exports.updateEmployee = updateEmployee;
/**
 * PUT /api/admin/attendance/:id/invalidate
 * Mark an attendance record as invalid and record in audit log
 */
const invalidateAttendance = async (req, res) => {
    const { id } = req.params; // attendance entry id
    try {
        // 1. Fetch attendance record and verify
        const checkAtt = await database_js_1.default.query('SELECT * FROM attendance WHERE id = $1', [id]);
        if (checkAtt.rows.length === 0) {
            res.status(404).json({ error: 'Attendance entry not found.' });
            return;
        }
        const attRecord = checkAtt.rows[0];
        // 2. Mark attendance as INVALID
        await database_js_1.default.query("UPDATE attendance SET status = 'INVALID', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
        // 3. Log an administrative invalidation event in the audit trail (attendance_logs)
        await database_js_1.default.query(`INSERT INTO attendance_logs (user_id, event_type, lat, lng, distance_from_office, accepted, reason)
       VALUES ($1, 'ADMIN_INVALIDATE', $2, $3, 0, false, $4)`, [
            attRecord.user_id,
            attRecord.check_in_lat || 0,
            attRecord.check_in_lng || 0,
            'Attendance record for date ' + new Date(attRecord.date).toISOString().split('T')[0] + ' marked as INVALID by Admin.'
        ]);
        res.status(200).json({
            message: 'Attendance entry successfully marked as INVALID and logged in the audit trail.',
            attendanceId: id,
            status: 'INVALID'
        });
    }
    catch (error) {
        console.error('❌ invalidateAttendance error:', error);
        res.status(500).json({ error: 'Internal server error invalidating attendance record.' });
    }
};
exports.invalidateAttendance = invalidateAttendance;
