import { Router } from 'express';
import {
  acceptAssignment,
  availabilitySchema,
  declineAssignment,
  declineAssignmentSchema,
  getAssignment,
  getStats,
  listAssignments,
  updateAvailability,
} from '../controllers/driver.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate, requireRole('driver'));

router.patch(
  '/availability',
  validateBody(availabilitySchema),
  asyncHandler(updateAvailability),
);
router.get('/stats', asyncHandler(getStats));
router.get('/assignments', asyncHandler(getAssignment));
router.get('/assignments/:id', asyncHandler(getAssignment));
router.post('/assignments/:id/accept', asyncHandler(acceptAssignment));
router.post(
  '/assignments/:id/decline',
  validateBody(declineAssignmentSchema),
  asyncHandler(declineAssignment),
);

export default router;
