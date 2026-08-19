import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
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
router.use('/admin', adminRoutes);

/*
 * Module routes are mounted here as each owner builds them:
 *
 *   router.use('/donations',   donationRoutes);   // Vidura
 *   router.use('/requests',    requestRoutes);    // Haritha
 *   router.use('/assignments', assignmentRoutes); // Kaushal
 *   router.use('/driver',      driverRoutes);     // Lakkhana
 *   router.use('/admin',       adminRoutes);      // Naily
 */

export default router;
