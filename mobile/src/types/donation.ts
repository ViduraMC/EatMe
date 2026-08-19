/**
 * Donation and Food Listing types. Mirrors what /api/donations returns.
 *
 * Prisma serialises Decimal as a string over JSON, so quantity fields are
 * strings here, not numbers. Parse them with Number() at the point of use
 * rather than assuming.
 */

export type ItemCategory = 'packaged' | 'prepared';
export type ItemUnit = 'kg' | 'servings' | 'loaves' | 'packets' | 'cans' | 'litres';
export type StorageType = 'ambient' | 'chilled' | 'frozen';
export type UrgencyLevel = 'critical' | 'urgent' | 'safe';

export type ListingStatus =
  'open' | 'partially_claimed' | 'fully_claimed' | 'expired' | 'cancelled';

export interface DonationItem {
  itemId: number;
  listingId: number;
  foodName: string;
  category: ItemCategory;
  /** Decimal over the wire. */
  quantity: string;
  quantityRemaining: string;
  unit: ItemUnit;
  storageType: StorageType;
  expiryDate: string | null;
  preparedAt: string | null;
  safeWindowHours: number | null;
  computedExpiry: string | null;
  isUrgent: boolean;
  /** Computed server side so the thresholds live in one place. */
  urgencyLevel: UrgencyLevel;
  /** Whichever of computedExpiry or expiryDate applies to this item. */
  effectiveExpiry: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingDonor {
  userId: number;
  name: string;
  organisationName: string | null;
  phone: string;
}

export interface DonationListing {
  listingId: number;
  donorId: number;
  title: string;
  description: string | null;
  pickupAddress: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  items: DonationItem[];
  donor: ListingDonor;
}

/** One item as the create form collects it, before it is sent. */
export interface DraftItem {
  foodName: string;
  category: ItemCategory;
  quantity: number;
  unit: ItemUnit;
  storageType: StorageType;
  /** Packaged only. ISO string. */
  expiryDate?: string | null;
  /** Prepared only. ISO string. */
  preparedAt?: string | null;
  /** Prepared only. */
  safeWindowHours?: number | null;
}

export interface CreateListingPayload {
  title: string;
  description?: string | null;
  pickupAddress: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  items: DraftItem[];
}

export interface UpdateListingPayload {
  title?: string;
  description?: string | null;
  pickupAddress?: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
}
