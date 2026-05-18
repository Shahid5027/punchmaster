import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', authenticateJWT, getMe);

export default router;
