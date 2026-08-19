import { Router } from 'express';
import {
  browseListings,
  cancelListing,
  createListing,
  createListingSchema,
  getListing,
  listMyListings,
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
