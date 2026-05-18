import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  getTodayAttendance,
  getMonthlyReports,
  getInsightsFeed,
  getEmployees,
  createEmployee,
  updateEmployee,
  invalidateAttendance
} from '../controllers/admin.controller.js';

const router = Router();

// Apply strict administration JWT security locks to all routes in this router sub-tree
router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

// Roster status lists joined with anomaly trust score details
router.get('/attendance/today', getTodayAttendance);

// Historical monthly compliance log datasets
router.get('/reports/monthly', getMonthlyReports);

// Chronological security telemetry feed
router.get('/insights/feed', getInsightsFeed);

// --- EMPLOYEE MANAGEMENT SYSTEM ---
// List, search, and filter employees
router.get('/employees', getEmployees);

// Create a new employee profile
router.post('/employees', createEmployee);

// Edit an employee profile details
router.put('/employees/:id', updateEmployee);

// Invalidate attendance record
router.put('/attendance/:id/invalidate', invalidateAttendance);

export default router;
