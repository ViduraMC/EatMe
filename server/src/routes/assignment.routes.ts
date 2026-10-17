import { Router } from 'express';
import {
  createAssignment,
  createAssignmentSchema,
  getAllAssignments,
  getAssignmentDetail,
  getDrivers,
  getQueue,
  getStats,
  reassignDriver,
  rejectRequest,
  rejectRequestSchema,
} from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * /api/assignments — Delivery Coordination (US-C01, US-C02, US-C03).
 * Owner: Kaushal Bandara (handled by agent).
 *
 * Every route requires coordinator authentication.
 */
const router = Router();

router.use(authenticate);
router.use(requireRole('coordinator'));

// Literal paths first so they are not swallowed by /:id
router.get('/queue', asyncHandler(getQueue));
router.get('/stats', asyncHandler(getStats));
router.get('/drivers', asyncHandler(getDrivers));

router.get('/', asyncHandler(getAllAssignments));
router.get('/:id', asyncHandler(getAssignmentDetail));

router.post('/', validateBody(createAssignmentSchema), asyncHandler(createAssignment));
router.post(
  '/:id/reassign',
  validateBody(createAssignmentSchema),
  asyncHandler(reassignDriver),
);
router.post(
  '/reject-request/:id',
  validateBody(rejectRequestSchema),
  asyncHandler(rejectRequest),
);

export default router;
