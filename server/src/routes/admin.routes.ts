import { Router } from 'express';

import {
  adminAssignments,
  adminCancelListing,
  adminCreateStaff,
  adminListings,
  adminRequests,
  adminStats,
  adminUpdateStaff,
  adminUpdateUserStatus,
  adminUsers,
} from '../controllers/admin.controller';

import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/stats', authenticate, requireRole('admin'), asyncHandler(adminStats));

router.get('/users', authenticate, requireRole('admin'), asyncHandler(adminUsers));

router.post(
  '/users/staff',
  authenticate,
  requireRole('admin'),
  asyncHandler(adminCreateStaff),
);

router.put(
  '/users/:userId/staff',
  authenticate,
  requireRole('admin'),
  asyncHandler(adminUpdateStaff),
);

router.patch(
  '/users/:userId/status',
  authenticate,
  requireRole('admin'),
  asyncHandler(adminUpdateUserStatus),
);

router.get('/listings', authenticate, requireRole('admin'), asyncHandler(adminListings));

router.patch(
  '/listings/:listingId/cancel',
  authenticate,
  requireRole('admin'),
  asyncHandler(adminCancelListing),
);

router.get('/requests', authenticate, requireRole('admin'), asyncHandler(adminRequests));

router.get(
  '/assignments',
  authenticate,
  requireRole('admin'),
  asyncHandler(adminAssignments),
);

export default router;
