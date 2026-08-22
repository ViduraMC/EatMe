import { Router } from 'express';
import {
  browseListings,
  cancelListing,
  confirmPickup,
  confirmPickupSchema,
  createListing,
  createListingSchema,
  getListing,
  listIncomingRequests,
  listMyListings,
  listPendingConfirmations,
  updateListing,
  updateListingSchema,
} from '../controllers/donation.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * /api/donations — Donation and Food Listing. Owner: Vidura.
 * Endpoint contract: docs/05-api-plan.md.
 *
 * Every route is authenticated. The role guard is what actually enforces who
 * can do what; the app's role based navigation only hides screens.
 */
const router = Router();

router.use(authenticate);

/*
 * Sprint 2 additions.
 *
 * These are declared before the generic /:id routes below, because Express
 * matches in declaration order and would otherwise read "assignments" and
 * "requests" as listing ids.
 *
 * They live under /api/donations rather than /api/assignments on purpose: the
 * assignment routes belong to the coordinator module, and this is the donor's
 * side of a shared record. Nothing here writes a coordinator or driver owned
 * column.
 */

// Read only. The Donation Coordinator accepts and rejects, not the donor.
router.get(
  '/requests/incoming',
  requireRole('donor'),
  asyncHandler(listIncomingRequests),
);

router.get(
  '/assignments/pending-confirmation',
  requireRole('donor'),
  asyncHandler(listPendingConfirmations),
);

router.patch(
  '/assignments/:assignmentId/confirm-pickup',
  requireRole('donor'),
  validateBody(confirmPickupSchema),
  asyncHandler(confirmPickup),
);

// Order matters: /mine must be declared before /:id, otherwise Express matches
// "mine" as an id and the request 400s on a non-numeric id.
router.get('/mine', requireRole('donor'), asyncHandler(listMyListings));

router.post(
  '/',
  requireRole('donor'),
  validateBody(createListingSchema),
  asyncHandler(createListing),
);

router.get('/', requireRole('recipient', 'admin'), asyncHandler(browseListings));

// Any signed-in role can read one listing: a coordinator and a driver both need
// the pickup address and the item manifest to do their job.
router.get('/:id', asyncHandler(getListing));

router.put(
  '/:id',
  requireRole('donor'),
  validateBody(updateListingSchema),
  asyncHandler(updateListing),
);

router.delete('/:id', requireRole('donor', 'admin'), asyncHandler(cancelListing));

export default router;
