import {
  Prisma,
  type AssignmentStatus,
  type ListingStatus,
  type RequestStatus,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import {
  buildExpiryFields,
  evaluateUrgency,
  type ExpiryInput,
  type UrgencyLevel,
} from './urgency.service';

/**
 * Donation and Food Listing business logic. Owner: Vidura.
 *
 * Controllers stay thin and call into here. Anything another module needs to
 * agree with, such as how urgency is written or when a listing becomes
 * partially claimed, lives in a service so there is one definition of it.
 */

/** What the client sends for one food item. Dates are already parsed. */
export interface ItemInput extends ExpiryInput {
  foodName: string;
  quantity: number;
  unit: 'kg' | 'servings' | 'loaves' | 'packets' | 'cans' | 'litres';
  storageType: 'ambient' | 'chilled' | 'frozen';
}

export interface CreateListingInput {
  title: string;
  description?: string | null;
  pickupAddress: string;
  pickupWindowStart: Date;
  pickupWindowEnd: Date;
  items: ItemInput[];
}

export interface BrowseFilters {
  search?: string;
  category?: 'packaged' | 'prepared';
  urgentOnly?: boolean;
  page: number;
  limit: number;
}

/** Everything a listing response includes. One definition, so shapes match. */
const listingInclude = {
  items: {
    orderBy: [{ isUrgent: 'desc' }, { itemId: 'asc' }],
  },
  donor: {
    select: {
      userId: true,
      name: true,
      organisationName: true,
      phone: true,
    },
  },
} satisfies Prisma.DonationListingInclude;

export type ListingWithItems = Prisma.DonationListingGetPayload<{
  include: typeof listingInclude;
}>;

/**
 * Adds urgencyLevel and effectiveExpiry to each item before it goes out.
 *
 * The stored is_urgent column is a boolean, but the app needs to tell critical
 * from urgent to pick the right colour. Deriving that on the client would mean
 * copying the 6 and 48 hour thresholds into the mobile code, where they would
 * eventually drift from urgency.service.ts and the phone would show green for
 * food the server considers critical. Sending it is the safer side to compute
 * on.
 *
 * Unlike evaluateUrgency this never throws. A row that somehow has no usable
 * expiry is reported as critical rather than crashing a list of otherwise fine
 * listings, and the caller can still see something is wrong with it.
 */
function presentItem(item: ListingWithItems['items'][number]) {
  try {
    const { level, effectiveExpiry } = evaluateUrgency({
      category: item.category,
      expiryDate: item.expiryDate,
      preparedAt: item.preparedAt,
      safeWindowHours: item.safeWindowHours,
    });
    return { ...item, urgencyLevel: level as UrgencyLevel, effectiveExpiry };
  } catch {
    return {
      ...item,
      urgencyLevel: 'critical' as UrgencyLevel,
      effectiveExpiry: item.computedExpiry ?? item.expiryDate ?? null,
    };
  }
}

/** Shapes a listing for the wire. Every donation response goes through this. */
export function presentListing(listing: ListingWithItems) {
  return { ...listing, items: listing.items.map(presentItem) };
}

export type PresentedListing = ReturnType<typeof presentListing>;

/**
 * Validates the pickup window.
 *
 * The database has a CHECK constraint for end-after-start, but a constraint
 * violation surfaces as an opaque error. Checking here produces something a
 * donor can act on.
 */
function assertValidPickupWindow(start: Date, end: Date): void {
  if (end.getTime() <= start.getTime()) {
    throw ApiError.badRequest('The pickup window must end after it starts');
  }
}

/**
 * Works out a listing's status from what is left of its items.
 *
 * open              nothing claimed yet
 * partially_claimed some but not all quantity is gone
 * fully_claimed     every item is down to zero
 *
 * Called after any change to item quantities, which for now means on donor
 * acceptance in Sprint 2. Kept here so that Haritha's request flow and my
 * listing flow cannot disagree about what "partially claimed" means.
 */
export function deriveListingStatus(
  items: Array<{ quantity: Prisma.Decimal; quantityRemaining: Prisma.Decimal }>,
  current: ListingStatus,
): ListingStatus {
  // cancelled and expired are terminal, they are never recomputed from stock.
  if (current === 'cancelled' || current === 'expired') {
    return current;
  }

  if (items.length === 0) {
    return 'open';
  }

  const allGone = items.every((i) => i.quantityRemaining.lessThanOrEqualTo(0));
  if (allGone) {
    return 'fully_claimed';
  }

  const anyClaimed = items.some((i) => i.quantityRemaining.lessThan(i.quantity));
  return anyClaimed ? 'partially_claimed' : 'open';
}

/** Loads a listing or throws 404. */
export async function getListingById(listingId: number): Promise<ListingWithItems> {
  const listing = await prisma.donationListing.findUnique({
    where: { listingId },
    include: listingInclude,
  });

  if (!listing) {
    throw ApiError.notFound('That listing does not exist');
  }

  return listing;
}

/**
 * Loads a listing and checks the caller owns it.
 *
 * Owning the row is not the same as being logged in, and a donor editing
 * another donor's listing would be a real bug, so every mutating route goes
 * through this rather than trusting an id from the client.
 */
async function getOwnedListing(
  listingId: number,
  donorId: number,
): Promise<ListingWithItems> {
  const listing = await getListingById(listingId);

  if (listing.donorId !== donorId) {
    // Deliberately 404, not 403. Saying "forbidden" would confirm that a
    // listing with this id exists and belongs to somebody else.
    throw ApiError.notFound('That listing does not exist');
  }

  return listing;
}

/**
 * Creates a listing and its items in one transaction.
 *
 * All or nothing on purpose: a listing with no items is not something a
 * recipient can act on, so a half-written listing is worse than none.
 */
export async function createListing(
  donorId: number,
  input: CreateListingInput,
): Promise<ListingWithItems> {
  assertValidPickupWindow(input.pickupWindowStart, input.pickupWindowEnd);

  if (input.items.length === 0) {
    throw ApiError.badRequest('A listing needs at least one food item');
  }

  // Urgency and the conditional expiry columns come from the shared service,
  // never written by hand here. buildExpiryFields throws with a readable
  // message if the packaged/prepared fields are inconsistent.
  const itemData = input.items.map((item) => ({
    foodName: item.foodName,
    quantity: new Prisma.Decimal(item.quantity),
    quantityRemaining: new Prisma.Decimal(item.quantity),
    unit: item.unit,
    storageType: item.storageType,
    ...buildExpiryFields({
      category: item.category,
      expiryDate: item.expiryDate ?? null,
      preparedAt: item.preparedAt ?? null,
      safeWindowHours: item.safeWindowHours ?? null,
    }),
  }));

  const listing = await prisma.donationListing.create({
    data: {
      donorId,
      title: input.title,
      description: input.description ?? null,
      pickupAddress: input.pickupAddress,
      pickupWindowStart: input.pickupWindowStart,
      pickupWindowEnd: input.pickupWindowEnd,
      status: 'open',
      items: { create: itemData },
    },
    include: listingInclude,
  });

  return listing;
}

/**
 * Browse, for recipients and admins.
 *
 * The ordering is the reason is_urgent is a stored column. This runs the
 * ordering in SQL against the (is_urgent, computed_expiry) index rather than
 * pulling every listing into memory and sorting there:
 *
 *   urgent listings first, then whichever expires soonest
 *
 * A listing is "urgent" if any of its remaining items is. COALESCE picks
 * computed_expiry for prepared food and expiry_date for packaged, which is
 * exactly the effective expiry the urgency service measures against.
 */
export async function browseListings(filters: BrowseFilters): Promise<{
  listings: ListingWithItems[];
  total: number;
  page: number;
  limit: number;
}> {
  const offset = (filters.page - 1) * filters.limit;

  const search = filters.search?.trim();
  const searchPattern = search ? `%${search}%` : null;

  // Parameterised throughout. Never interpolate a filter into the SQL string.
  const conditions = Prisma.sql`
    l.status IN ('open', 'partially_claimed')
    AND i.quantity_remaining > 0
    /*
     * Hide food that has already expired.
     *
     * docs/03 section 6 says a scheduled check flips listing.status to
     * expired once the pickup window passes, but no scheduler exists yet, so
     * without this an item that spoiled days ago still appears as available.
     * Offering a charity expired food is the worst failure this system can
     * have, so browse filters on the real expiry rather than waiting for a
     * status that nothing currently writes.
     */
    AND COALESCE(i.computed_expiry, i.expiry_date) > now()
    ${
      searchPattern
        ? Prisma.sql`AND (l.title ILIKE ${searchPattern}
              OR l.description ILIKE ${searchPattern}
              OR i.food_name ILIKE ${searchPattern})`
        : Prisma.empty
    }
    ${filters.category ? Prisma.sql`AND i.category = ${filters.category}::"ItemCategory"` : Prisma.empty}
    ${filters.urgentOnly ? Prisma.sql`AND i.is_urgent = true` : Prisma.empty}
  `;

  const ordered = await prisma.$queryRaw<Array<{ listing_id: number }>>(Prisma.sql`
    SELECT l.listing_id
    FROM donation_listings l
    JOIN donation_items i ON i.listing_id = l.listing_id
    WHERE ${conditions}
    GROUP BY l.listing_id
    ORDER BY
      MAX(CASE WHEN i.is_urgent THEN 1 ELSE 0 END) DESC,
      MIN(COALESCE(i.computed_expiry, i.expiry_date)) ASC
    LIMIT ${filters.limit} OFFSET ${offset}
  `);

  const counted = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(DISTINCT l.listing_id) AS count
    FROM donation_listings l
    JOIN donation_items i ON i.listing_id = l.listing_id
    WHERE ${conditions}
  `);

  const ids = ordered.map((row) => row.listing_id);
  if (ids.length === 0) {
    return { listings: [], total: 0, page: filters.page, limit: filters.limit };
  }

  const listings = await prisma.donationListing.findMany({
    where: { listingId: { in: ids } },
    include: listingInclude,
  });

  // findMany does not preserve the order of the IN list, so restore the order
  // the ranking query produced.
  const byId = new Map(listings.map((l) => [l.listingId, l]));
  const inOrder = ids.map((id) => byId.get(id)).filter((l): l is ListingWithItems => !!l);

  return {
    listings: inOrder,
    total: Number(counted[0]?.count ?? 0),
    page: filters.page,
    limit: filters.limit,
  };
}

/** The current donor's own listings, newest first, whatever their status. */
export async function listDonorListings(donorId: number): Promise<ListingWithItems[]> {
  return prisma.donationListing.findMany({
    where: { donorId },
    include: listingInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export interface UpdateListingInput {
  title?: string;
  description?: string | null;
  pickupAddress?: string;
  pickupWindowStart?: Date;
  pickupWindowEnd?: Date;
}

/**
 * Updates the listing's own details. Items are not touched here.
 *
 * A cancelled or fully claimed listing is not editable: recipients may already
 * have acted on it, and quietly changing the pickup address under them would
 * be worse than making the donor cancel and relist.
 */
export async function updateListing(
  listingId: number,
  donorId: number,
  input: UpdateListingInput,
): Promise<ListingWithItems> {
  const existing = await getOwnedListing(listingId, donorId);

  if (existing.status === 'cancelled') {
    throw ApiError.badRequest('This listing was cancelled and can no longer be edited');
  }
  if (existing.status === 'fully_claimed') {
    throw ApiError.badRequest('Every item has been claimed, so this listing is closed');
  }

  const start = input.pickupWindowStart ?? existing.pickupWindowStart;
  const end = input.pickupWindowEnd ?? existing.pickupWindowEnd;
  assertValidPickupWindow(start, end);

  return prisma.donationListing.update({
    where: { listingId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.pickupAddress !== undefined
        ? { pickupAddress: input.pickupAddress }
        : {}),
      ...(input.pickupWindowStart !== undefined ? { pickupWindowStart: start } : {}),
      ...(input.pickupWindowEnd !== undefined ? { pickupWindowEnd: end } : {}),
    },
    include: listingInclude,
  });
}

/**
 * Cancels a listing. This is a SOFT cancel: status becomes cancelled and the
 * row stays.
 *
 * Nothing is ever deleted, because a listing may already have requests against
 * it and the history is what the admin dashboard and the report are built on.
 *
 * An admin can cancel any listing as a moderation action; a donor can only
 * cancel their own.
 *
 * Note for the team: docs/03-database-design.md section 7 still lists whether
 * admin moderation should use this endpoint or /api/admin/listings/:id as an
 * open decision. This implements the endpoint from docs/05-api-plan.md, which
 * allows both roles.
 */
export async function cancelListing(
  listingId: number,
  actor: { userId: number; role: string },
): Promise<ListingWithItems> {
  const listing =
    actor.role === 'admin'
      ? await getListingById(listingId)
      : await getOwnedListing(listingId, actor.userId);

  if (listing.status === 'cancelled') {
    // Already in the target state. Returning it rather than erroring keeps the
    // endpoint idempotent, so a double tap on a slow connection is harmless.
    return listing;
  }

  return prisma.donationListing.update({
    where: { listingId },
    data: { status: 'cancelled' },
    include: listingInclude,
  });
}

// ---------------------------------------------------------------------------
// Handover confirmation, donor side
//
// Sprint 2 design decision: the donor no longer accepts or rejects requests.
// That moved to the Donation Coordinator, who already owns matching and
// assignment. Confirming handover is the donor's only remaining active step
// after posting, so it lives here in the donation module.
//
// These functions write DeliveryAssignment, which is the coordinator's table,
// but only ever the two donor-owned pickup columns plus the status transition
// below. They never touch request.status or any driver-owned column.
// ---------------------------------------------------------------------------

/** Everything the confirm-pickup screen needs, in one definition. */
const assignmentInclude = {
  request: {
    include: {
      listing: {
        select: {
          listingId: true,
          donorId: true,
          title: true,
          pickupAddress: true,
          pickupWindowStart: true,
          pickupWindowEnd: true,
        },
      },
      recipient: {
        select: { userId: true, name: true, organisationName: true, phone: true },
      },
      items: {
        include: {
          item: {
            select: { itemId: true, foodName: true, unit: true, category: true },
          },
        },
      },
    },
  },
  driver: { select: { userId: true, name: true, phone: true } },
} satisfies Prisma.DeliveryAssignmentInclude;

export type AssignmentForDonor = Prisma.DeliveryAssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

/**
 * Assignments waiting on this donor's pickup confirmation.
 *
 * "Waiting on the donor" means a driver has accepted the job and the donor has
 * not yet confirmed the food changed hands. Declined and cancelled assignments
 * are excluded, because there is nothing left to hand over.
 */
export async function listAssignmentsPendingDonorConfirmation(
  donorId: number,
): Promise<AssignmentForDonor[]> {
  return prisma.deliveryAssignment.findMany({
    where: {
      pickupDonorConfirmedAt: null,
      status: { in: ['accepted', 'in_transit'] },
      request: { listing: { donorId } },
    },
    include: assignmentInclude,
    orderBy: { assignedAt: 'asc' },
  });
}

/**
 * Loads an assignment and checks it belongs to one of this donor's listings.
 *
 * 404 rather than 403 for anyone else, matching the rest of this module: a 403
 * would confirm that an assignment with that id exists.
 */
async function getDonorAssignment(
  assignmentId: number,
  donorId: number,
): Promise<AssignmentForDonor> {
  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { assignmentId },
    include: assignmentInclude,
  });

  if (!assignment || assignment.request.listing.donorId !== donorId) {
    throw ApiError.notFound('That delivery does not exist');
  }

  return assignment;
}

/**
 * Decides what status an assignment should hold after a pickup confirmation.
 *
 * THE RULE, in one place: an assignment becomes in_transit only when BOTH
 * sides have confirmed the pickup. One side alone does not demonstrate the
 * food changed hands, and a handover is only trustworthy if both parties say
 * it happened.
 *
 * Exported so the driver module can apply the identical rule from its own
 * side rather than copying it.
 */
export function statusAfterPickupConfirmation(assignment: {
  status: AssignmentStatus;
  pickupDonorConfirmedAt: Date | null;
  pickupDriverConfirmedAt: Date | null;
}): AssignmentStatus {
  // Terminal states are never recomputed from timestamps.
  if (
    assignment.status === 'completed' ||
    assignment.status === 'declined' ||
    assignment.status === 'cancelled'
  ) {
    return assignment.status;
  }

  const bothConfirmed =
    assignment.pickupDonorConfirmedAt !== null &&
    assignment.pickupDriverConfirmedAt !== null;

  return bothConfirmed ? 'in_transit' : assignment.status;
}

export interface ConfirmPickupInput {
  /** Optional free text written to pickup_notes. */
  notes?: string | null;
}

/**
 * The donor confirms the food has been handed to the driver.
 *
 * Writes pickup_donor_confirmed_at and, when the driver has already confirmed,
 * moves the assignment to in_transit via statusAfterPickupConfirmation.
 *
 * The timestamp and the status change go in a single update: a timestamp
 * written without the matching status change would leave a delivery both
 * parties confirmed that never left "accepted", and nothing downstream would
 * notice.
 */
export async function confirmPickupAsDonor(
  assignmentId: number,
  donorId: number,
  input: ConfirmPickupInput = {},
): Promise<AssignmentForDonor> {
  const existing = await getDonorAssignment(assignmentId, donorId);

  // Reject rather than silently overwriting. The first timestamp records when
  // the handover actually happened; overwriting it destroys that evidence.
  if (existing.pickupDonorConfirmedAt) {
    throw ApiError.badRequest(
      'You have already confirmed this pickup. It cannot be confirmed twice.',
    );
  }

  if (existing.status === 'declined' || existing.status === 'cancelled') {
    throw ApiError.badRequest(
      'This delivery is no longer active, so there is nothing to confirm',
    );
  }
  if (existing.status === 'completed') {
    throw ApiError.badRequest('This delivery is already complete');
  }
  if (existing.status === 'pending_driver') {
    throw ApiError.badRequest(
      'The driver has not accepted this delivery yet, so there is nothing to hand over',
    );
  }

  const confirmedAt = new Date();
  const nextStatus = statusAfterPickupConfirmation({
    status: existing.status,
    pickupDonorConfirmedAt: confirmedAt,
    pickupDriverConfirmedAt: existing.pickupDriverConfirmedAt,
  });

  return prisma.deliveryAssignment.update({
    where: { assignmentId },
    data: {
      pickupDonorConfirmedAt: confirmedAt,
      status: nextStatus,
      ...(input.notes ? { pickupNotes: input.notes } : {}),
    },
    include: assignmentInclude,
  });
}

// ---------------------------------------------------------------------------
// Incoming requests, READ ONLY
//
// The donor can see who has asked for their food but cannot act on it. The
// Donation Coordinator accepts and rejects. Nothing below writes
// request.status, and nothing here should ever start to.
// ---------------------------------------------------------------------------

const incomingRequestInclude = {
  listing: { select: { listingId: true, title: true, status: true } },
  recipient: {
    select: { userId: true, name: true, organisationName: true, phone: true },
  },
  items: {
    include: {
      item: {
        select: { itemId: true, foodName: true, unit: true, category: true },
      },
    },
  },
} satisfies Prisma.DonationRequestInclude;

export type IncomingRequest = Prisma.DonationRequestGetPayload<{
  include: typeof incomingRequestInclude;
}>;

/**
 * Requests made against this donor's listings.
 *
 * Scoped through listing.donorId, never through anything the client sends, so
 * a donor cannot reach another donor's requests by guessing an id.
 */
export async function listIncomingRequests(
  donorId: number,
  status?: RequestStatus,
): Promise<IncomingRequest[]> {
  return prisma.donationRequest.findMany({
    where: {
      listing: { donorId },
      ...(status ? { status } : {}),
    },
    include: incomingRequestInclude,
    orderBy: { createdAt: 'desc' },
  });
}
