import { Router } from 'express';
import { getOfficeConfig, updateOfficeConfig } from '../controllers/settings.controller.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

// Secure geofence parameters retrieval under JWT validation middleware
router.get('/office', authenticateJWT, getOfficeConfig);

// Update geofence parameters under strict Admin role check
router.put('/office', authenticateJWT, authorizeRoles('admin'), updateOfficeConfig);

export default router;
