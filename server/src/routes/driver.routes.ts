import { Router } from 'express';
import {
  acceptAssignment,
  availabilitySchema,
  confirmDropoff,
  confirmDropoffSchema,
  confirmPickup,
  confirmPickupSchema,
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
router.get('/assignments', asyncHandler(listAssignments));
router.get('/assignments/:id', asyncHandler(getAssignment));
router.put('/assignments/:id/accept', asyncHandler(acceptAssignment));
router.put(
  '/assignments/:id/decline',
  validateBody(declineAssignmentSchema),
  asyncHandler(declineAssignment),
);

// US-DR03: Confirm Pickup and Confirm Drop Off (driver side).
router.put(
  '/assignments/:id/confirm-pickup',
  validateBody(confirmPickupSchema),
  asyncHandler(confirmPickup),
);
router.put(
  '/assignments/:id/confirm-dropoff',
  validateBody(confirmDropoffSchema),
  asyncHandler(confirmDropoff),
);

export default router;
