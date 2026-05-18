"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeAttendanceSession = void 0;
const database_js_1 = __importDefault(require("../config/database.js"));
const haversine_js_1 = require("../utils/haversine.js");
/**
 * Executes a statistical attendance analysis on an employee check-in session
 * to determine analytics confidence levels and workforce trends.
 */
const analyzeAttendanceSession = async (userId, attendanceId, currentLat, currentLng, checkInTime, shiftStartTime) => {
    try {
        // 1. Audit check: Count failed out-of-zone punch logs over the past 24 hours
        const logsQuery = `
      SELECT COUNT(*) as failed_count 
      FROM attendance_logs 
      WHERE user_id = $1 
        AND event_type = 'CHECK_IN_FAIL' 
        AND timestamp >= NOW() - INTERVAL '24 HOURS'
    `;
        const logsResult = await database_js_1.default.query(logsQuery, [userId]);
        const failedCount = parseInt(logsResult.rows[0].failed_count) || 0;
        // 2. Late Arrival Pattern Analysis: Check last 5 attendances for 'LATE' status
        const lateQuery = `
      SELECT status 
      FROM attendance 
      WHERE user_id = $1 
        AND id != $2 
      ORDER BY date DESC 
      LIMIT 5
    `;
        const lateResult = await database_js_1.default.query(lateQuery, [userId, attendanceId]);
        const recentLateCount = lateResult.rows.filter((r) => r.status === 'LATE').length;
        const hasLatePattern = recentLateCount >= 2;
        // 3. Location check: Pull centroid of user's past successful check-ins
        const pastQuery = `
      SELECT check_in_lat, check_in_lng 
      FROM attendance 
      WHERE user_id = $1 
        AND check_in_lat IS NOT NULL 
        AND id != $2 
      ORDER BY date DESC 
      LIMIT 5
    `;
        const pastResult = await database_js_1.default.query(pastQuery, [userId, attendanceId]);
        let unusualLocation = false;
        let locationDetails = 'First attendance profile registered.';
        if (pastResult.rows.length >= 2) {
            const lats = pastResult.rows.map((r) => parseFloat(r.check_in_lat));
            const lngs = pastResult.rows.map((r) => parseFloat(r.check_in_lng));
            const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
            const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
            const centroidDistance = (0, haversine_js_1.calculateDistance)(currentLat, currentLng, avgLat, avgLng);
            if (centroidDistance > 100) {
                unusualLocation = true;
                locationDetails = `Check-in coordinates drifted ${centroidDistance.toFixed(1)}m from usual location.`;
            }
            else {
                locationDetails = `Location verified within normal parameters. Variance: ${centroidDistance.toFixed(1)}m.`;
            }
        }
        // 4. Confidence Score Calculation (Workforce Analytics logic)
        let score = 98; // Base clean audit score
        let reasons = [];
        if (unusualLocation) {
            score -= 24; // drops to 74%
            reasons.push('Unusual check-in location detected');
        }
        if (hasLatePattern) {
            score -= 15;
            reasons.push(`Repeated late arrivals detected (${recentLateCount} in last 5 shifts)`);
        }
        if (failedCount > 0) {
            const deduction = Math.min(failedCount * 15, 45); // caps at 45
            score -= deduction;
            reasons.push(`Repeated out-of-zone attempts: ${failedCount}`);
        }
        // Ensure score bounded strictly to 10 - 100
        score = Math.max(10, Math.min(100, score));
        // Determine status boundaries based on analytics
        let confidenceStatus = 'Normal';
        if (score < 60 || failedCount >= 3 || hasLatePattern) {
            confidenceStatus = 'Unusual activity';
        }
        else if (score < 90 || unusualLocation) {
            confidenceStatus = 'Unusual location';
        }
        // Readable admin summaries (e.g. "3 employees attempted check-in outside office radius" for global reports, but here we provide per-user readable summaries)
        const details = reasons.length > 0
            ? `${reasons.join('. ')}. ${locationDetails}`
            : `Verified attendance. ${locationDetails}`;
        // 5. Write computed insights record into DB
        await database_js_1.default.query(`INSERT INTO attendance_insights (attendance_id, user_id, confidence_score, confidence_status, failed_checkin_count, unusual_location_detected, unusual_time_detected, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [attendanceId, userId, score, confidenceStatus, failedCount, unusualLocation, hasLatePattern, details]);
        return {
            confidenceScore: score,
            confidenceStatus,
            failedCount,
            unusualLocation,
            unusualTime: hasLatePattern,
            details,
        };
    }
    catch (error) {
        console.error('❌ Attendance Analytics Engine failure:', error);
        return {
            confidenceScore: 98,
            confidenceStatus: 'Normal',
            failedCount: 0,
            unusualLocation: false,
            unusualTime: false,
            details: 'Analytics processed with default parameters due to internal error.',
        };
    }
};
exports.analyzeAttendanceSession = analyzeAttendanceSession;
