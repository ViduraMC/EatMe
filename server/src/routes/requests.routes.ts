import { Router } from 'express';
import {
  cancelRequest,
  createRequest,
  createRequestSchema,
  getRequest,
  listMyRequests,
} from '../controllers/request.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * /api/requests — Food Requests. Owner: Haritha.
 * Endpoint contract: docs/05-api-plan.md.
 *
 * Accepting and rejecting are NOT here. Sprint 2 moved approval to the
 * Donation Coordinator, who already owns matching and assignment, so those
 * endpoints belong to the coordinator module.
 */
const router = Router();

router.use(authenticate);

// Order matters: /mine must be declared before /:id, otherwise Express matches
// "mine" as an id and the request 400s on a non-numeric id.
router.get('/mine', requireRole('recipient'), asyncHandler(listMyRequests));

router.post(
  '/',
  requireRole('recipient'),
  validateBody(createRequestSchema),
  asyncHandler(createRequest),
);

// No role guard: the service decides, because both the recipient who made the
// request and the donor whose listing it is are allowed to read it.
router.get('/:id', asyncHandler(getRequest));

router.patch('/:id/cancel', requireRole('recipient'), asyncHandler(cancelRequest));

export default router;
