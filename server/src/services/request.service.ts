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
