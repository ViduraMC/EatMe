import { Router } from 'express';
import {
  createAssignment,
  createAssignmentSchema,
  getAllAssignments,
  getDrivers,
  getQueue,
  getStats,
  rejectRequest,
  rejectRequestSchema,
} from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * /api/assignments — Delivery Coordination (US-C01 & US-C02).
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

router.get('/', asyncHandler(getAllAssignments));
router.post('/', validateBody(createAssignmentSchema), asyncHandler(createAssignment));
router.post(
  '/reject-request/:id',
  validateBody(rejectRequestSchema),
  asyncHandler(rejectRequest),
);

export default router;
