/**
 * Food Requests types. Mirrors what /api/requests returns.
 *
 * Prisma serialises Decimal as a string over JSON, so quantity fields are
 * strings here, not numbers. Parse them with Number() at the point of use.
 */

import type { ItemCategory, ItemUnit, ListingStatus } from '@prisma/client';
import type { PublicUser } from './auth';

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface RequestedItem {
  requestItemId: number;
  requestId: number;
  itemId: number;
  /** Decimal over the wire. */
  quantityRequested: string;
  item: {
    itemId: number;
    foodName: string;
    unit: ItemUnit;
    category: ItemCategory;
    quantity: string;
    quantityRemaining: string;
  };
}

export interface RequestListingSummary {
  listingId: number;
  title: string;
  status: ListingStatus;
  pickupAddress: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  donor: {
    userId: number;
    name: string;
    organisationName: string | null;
    phone: string;
  };
}

export interface DonationRequest {
  requestId: number;
  listingId: number;
  recipientId: number;
  message: string | null;
  status: RequestStatus;
  rejectionReason: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  listing: RequestListingSummary;
  recipient: PublicUser;
  items: RequestedItem[];
}

export interface CreateRequestPayload {
  listingId: number;
  message?: string | null;
  items: Array<{ itemId: number; quantityRequested: number }>;
}
