import { Router } from 'express';
import { getDrivers, getQueue, getStats } from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * /api/assignments — Delivery Coordination.
 * Owner: Kaushal Bandara (handled by agent).
 *
 * Every route requires coordinator authentication.
 */
const router = Router();

router.use(authenticate);
router.use(requireRole('coordinator'));

router.get('/queue', asyncHandler(getQueue));
router.get('/stats', asyncHandler(getStats));
router.get('/drivers', asyncHandler(getDrivers));

export default router;
