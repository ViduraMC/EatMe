import { Router } from 'express';
import { adminStats } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/stats', authenticate, requireRole('admin'), asyncHandler(adminStats));

export default router;
