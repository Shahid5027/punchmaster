import { Router } from 'express';
import authRoutes from './auth.routes.js';
import attendanceRoutes from './attendance.routes.js';
import settingsRoutes from './settings.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

// Hook up sub-routes
router.use('/auth', authRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);

export default router;

