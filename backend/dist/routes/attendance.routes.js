"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_js_1 = require("../controllers/attendance.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const router = (0, express_1.Router)();
// Secure all endpoints under JWT auth middleware
router.use(auth_middleware_js_1.authenticateJWT);
router.post('/check-in', attendance_controller_js_1.checkIn);
router.post('/check-out', attendance_controller_js_1.checkOut);
router.get('/today', attendance_controller_js_1.getTodayStatus);
router.get('/history', attendance_controller_js_1.getAttendanceHistory);
exports.default = router;
