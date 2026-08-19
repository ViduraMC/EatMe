import { Router } from 'express';
import {
  adminAssignments,
  adminListings,
  adminRequests,
  adminStats,
  adminUsers,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/stats', authenticate, requireRole('admin'), asyncHandler(adminStats));

router.get('/users', authenticate, requireRole('admin'), asyncHandler(adminUsers));

router.get('/listings', authenticate, requireRole('admin'), asyncHandler(adminListings));

router.get('/requests', authenticate, requireRole('admin'), asyncHandler(adminRequests));

router.get(
  '/assignments',
  authenticate,
  requireRole('admin'),
  asyncHandler(adminAssignments),
);

export default router;
