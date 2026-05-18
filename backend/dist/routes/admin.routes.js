"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const admin_controller_js_1 = require("../controllers/admin.controller.js");
const router = (0, express_1.Router)();
// Apply strict administration JWT security locks to all routes in this router sub-tree
router.use(auth_middleware_js_1.authenticateJWT);
router.use((0, auth_middleware_js_1.authorizeRoles)('admin'));
// Roster status lists joined with anomaly trust score details
router.get('/attendance/today', admin_controller_js_1.getTodayAttendance);
// Historical monthly compliance log datasets
router.get('/reports/monthly', admin_controller_js_1.getMonthlyReports);
// Chronological security telemetry feed
router.get('/insights/feed', admin_controller_js_1.getInsightsFeed);
// --- EMPLOYEE MANAGEMENT SYSTEM ---
// List, search, and filter employees
router.get('/employees', admin_controller_js_1.getEmployees);
// Create a new employee profile
router.post('/employees', admin_controller_js_1.createEmployee);
// Edit an employee profile details
router.put('/employees/:id', admin_controller_js_1.updateEmployee);
// Invalidate attendance record
router.put('/attendance/:id/invalidate', admin_controller_js_1.invalidateAttendance);
exports.default = router;
