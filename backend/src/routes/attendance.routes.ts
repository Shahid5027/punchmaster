import { Router } from 'express';
import { checkIn, checkOut, getTodayStatus, getAttendanceHistory } from '../controllers/attendance.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Secure all endpoints under JWT auth middleware
router.use(authenticateJWT);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getTodayStatus);
router.get('/history', getAttendanceHistory);

export default router;
