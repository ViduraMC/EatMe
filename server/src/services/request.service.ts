import { Prisma, type RequestStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { publicUserSelect } from '../types/auth';
import { deriveListingStatus } from './donation.service';

/**
 * Food Requests business logic. Owner: Haritha.
 *
 * Controllers stay thin and call into here. Rules another module has to agree
 * with, such as when stock moves, come from the shared services rather than
 * being written again in this file.
 */

/** Everything a request response includes. One definition, so shapes match. */
const requestInclude = {
  listing: {
    select: {
      listingId: true,
      title: true,
      status: true,
      pickupAddress: true,
      pickupWindowStart: true,
      pickupWindowEnd: true,
      donor: {
        select: { userId: true, name: true, organisationName: true, phone: true },
      },
    },
  },
  recipient: { select: publicUserSelect },
  items: {
    include: {
      item: {
        select: {
          itemId: true,
          foodName: true,
          unit: true,
          category: true,
          quantity: true,
          quantityRemaining: true,
        },
      },
    },
  },
} satisfies Prisma.DonationRequestInclude;

export type RequestWithItems = Prisma.DonationRequestGetPayload<{
  include: typeof requestInclude;
}>;

export interface RequestItemInput {
  itemId: number;
  quantityRequested: number;
}

export interface CreateRequestInput {
  listingId: number;
  message?: string | null;
  items: RequestItemInput[];
}

/**
 * Loads a request and checks the caller is allowed to see it.
 *
 * Allowed means: the recipient who made it, or the donor who owns the listing.
 * Anyone else gets 404 rather than 403, because a 403 would confirm that a
 * request with that id exists.
 */

export async function getRequestById(
  requestId: number,
  actor: { userId: number; role: string },
): Promise<RequestWithItems> {
  const request = await prisma.donationRequest.findUnique({
    where: { requestId },
    include: requestInclude,
  });

  if (!request) {
    throw ApiError.notFound('That request does not exist');
  }

  const isRecipient = request.recipientId === actor.userId;
  const isDonor = request.listing.donor.userId === actor.userId;
  const isAdmin = actor.role === 'admin';

  if (!isRecipient && !isDonor && !isAdmin) {
    throw ApiError.notFound('That request does not exist');
  }

  return request;
}

/**
 * Creates a request for specific items and quantities.
 *
 * Everything happens in one transaction so a request can never be written with
 * only some of its items.
 *
 * This deliberately does NOT touch quantityRemaining. Stock only moves when the
 * coordinator accepts. A pending request must not reserve food, otherwise one
 * recipient sitting on an unanswered request blocks everyone else from asking
 * for the same thing.
 */

export async function createRequest(
  recipientId: number,
  input: CreateRequestInput,
): Promise<RequestWithItems> {
  if (input.items.length === 0) {
    throw ApiError.badRequest('Choose at least one item to request');
  }

  const listing = await prisma.donationListing.findUnique({
    where: { listingId: input.listingId },
    include: { items: true },
  });

  if (!listing) {
    throw ApiError.notFound('That listing does not exist');
  }

  if (listing.donorId === recipientId) {
    throw ApiError.badRequest('You cannot request food from your own listing');
  }

  if (listing.status !== 'open' && listing.status !== 'partially_claimed') {
    throw ApiError.badRequest('That listing is no longer accepting requests');
  }

  const now = new Date();

  for (const requested of input.items) {
    // Every requested item must belong to THIS listing. Without this check a
    // recipient could reach another donor's item by passing its id.
    const item = listing.items.find((i) => i.itemId === requested.itemId);
    if (!item) {
      throw ApiError.badRequest('One of those items is not part of this listing');
    }

    const effectiveExpiry = item.computedExpiry ?? item.expiryDate;
    if (effectiveExpiry && effectiveExpiry.getTime() <= now.getTime()) {
      // Time passes between browsing and submitting. Browse already filters
      // expired food out, but re-checking here is what stops a charity being
      // handed something that spoiled while the form was open.
      throw ApiError.badRequest(
        `${item.foodName} has expired and can no longer be requested`,
      );
    }

    if (
      new Prisma.Decimal(requested.quantityRequested).greaterThan(item.quantityRemaining)
    ) {
      throw ApiError.badRequest(
        `Only ${item.quantityRemaining.toString()} ${item.unit} of ${item.foodName} left`,
      );
    }
  }

  return prisma.donationRequest.create({
    data: {
      listingId: input.listingId,
      recipientId,
      message: input.message ?? null,
      status: 'pending',
      items: {
        create: input.items.map((i) => ({
          itemId: i.itemId,
          quantityRequested: new Prisma.Decimal(i.quantityRequested),
        })),
      },
    },
    include: requestInclude,
  });
}

/** The recipient's own requests, newest first. */
export async function listMyRequests(
  recipientId: number,
  status?: RequestStatus,
): Promise<RequestWithItems[]> {
  return prisma.donationRequest.findMany({
    where: { recipientId, ...(status ? { status } : {}) },
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
  });
}
