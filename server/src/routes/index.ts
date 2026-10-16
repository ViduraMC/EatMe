import { Router } from 'express';
import authRoutes from './auth.routes';
import driverRoutes from './driver.routes';
import adminRoutes from './admin.routes';
import donationRoutes from './donation.routes';
import assignmentRoutes from './assignment.routes';
import { sendSuccess } from '../utils/apiResponse';
import requestRoutes from './requests.routes';

const router = Router();

/**
 * GET /api/health
 *
 * Unprotected on purpose. This is the first thing a team member hits from the
 * phone's browser to prove the device can reach the laptop over the LAN, before
 * blaming their code for a connection problem.
 */
router.get('/health', (req, res) => {
  sendSuccess(res, {
    status: 'ok',
    // The caller's own address as the server sees it. Used once after a deploy
    // to set TRUST_PROXY_HOPS correctly; it only ever shows you your own IP.
    clientIp: req.ip,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

router.use('/auth', authRoutes);
router.use('/driver', driverRoutes);
router.use('/admin', adminRoutes);
router.use('/donations', donationRoutes);
router.use('/requests', requestRoutes);
router.use('/assignments', assignmentRoutes);

export default router;
