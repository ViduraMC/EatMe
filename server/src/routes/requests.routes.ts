import { Router } from 'express';
import {
  cancelRequest,
  confirmDropoff,
  confirmDropoffRecipientSchema,
  createRequest,
  createRequestSchema,
  getRequest,
  listMyRequests,
  listPendingDropoffs,
} from '../controllers/request.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * /api/requests — Food Requests. Owner: Haritha.
 * Endpoint contract: docs/05-api-plan.md.
 */
const router = Router();

router.use(authenticate);

// Order matters: literal paths must be declared before /:id
router.get('/mine', requireRole('recipient'), asyncHandler(listMyRequests));

router.get(
  '/deliveries/pending-dropoff',
  requireRole('recipient'),
  asyncHandler(listPendingDropoffs),
);

router.put(
  '/deliveries/:id/confirm-dropoff',
  requireRole('recipient'),
  validateBody(confirmDropoffRecipientSchema),
  asyncHandler(confirmDropoff),
);

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
