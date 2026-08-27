import { Router } from 'express';
import authRoutes from './auth.routes';
import driverRoutes from './driver.routes';
import adminRoutes from './admin.routes';
import donationRoutes from './donation.routes';
import assignmentRoutes from './assignment.routes';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

/**
 * GET /api/health
 *
 * Unprotected on purpose. This is the first thing a team member hits from the
 * phone's browser to prove the device can reach the laptop over the LAN, before
 * blaming their code for a connection problem.
 */
router.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

router.use('/auth', authRoutes);
router.use('/driver', driverRoutes);
router.use('/admin', adminRoutes);
router.use('/donations', donationRoutes);
router.use('/assignments', assignmentRoutes);

/*
 * Module routes are mounted here as each owner builds them:
 *
 *   router.use('/requests',    requestRoutes);    // Haritha
 *   router.use('/driver',      driverRoutes);     // Lakkhana
 */

export default router;
