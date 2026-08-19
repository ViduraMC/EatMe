import { api } from './client';
import type { ApiSuccess } from '../types';
import type {
  CreateListingPayload,
  DonationListing,
  UpdateListingPayload,
} from '../types/donation';

/**
 * /api/donations. Owner: Vidura.
 *
 * Every call goes through the shared axios instance, so the Bearer token is
 * attached and a 401 ends the session automatically.
 */

export async function createListing(
  payload: CreateListingPayload,
): Promise<DonationListing> {
  const { data } = await api.post<ApiSuccess<{ listing: DonationListing }>>(
    '/donations',
    payload,
  );
  return data.data.listing;
}

/** The signed-in donor's own listings, newest first, any status. */
export async function fetchMyListings(): Promise<DonationListing[]> {
  const { data } =
    await api.get<ApiSuccess<{ listings: DonationListing[] }>>('/donations/mine');
  return data.data.listings;
}

export async function fetchListing(listingId: number): Promise<DonationListing> {
  const { data } = await api.get<ApiSuccess<{ listing: DonationListing }>>(
    `/donations/${listingId}`,
  );
  return data.data.listing;
}

export async function updateListing(
  listingId: number,
  payload: UpdateListingPayload,
): Promise<DonationListing> {
  const { data } = await api.put<ApiSuccess<{ listing: DonationListing }>>(
    `/donations/${listingId}`,
    payload,
  );
  return data.data.listing;
}

/** Soft cancel. The listing stays in /mine with status cancelled. */
export async function cancelListing(listingId: number): Promise<DonationListing> {
  const { data } = await api.delete<ApiSuccess<{ listing: DonationListing }>>(
    `/donations/${listingId}`,
  );
  return data.data.listing;
}

export interface BrowseParams {
  search?: string;
  category?: 'packaged' | 'prepared';
  urgentOnly?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Browse open listings, urgent first.
 *
 * Recipients and admins only; a donor gets 403. Lives here because the
 * endpoint belongs to /api/donations, but the recipient module is what calls
 * it, so do not change its shape without telling Haritha.
 */
export async function browseListings(params: BrowseParams = {}): Promise<{
  listings: DonationListing[];
  total: number;
  page: number;
  limit: number;
}> {
  const { data } = await api.get<
    ApiSuccess<{
      listings: DonationListing[];
      total: number;
      page: number;
      limit: number;
    }>
  >('/donations', {
    params: {
      ...(params.search ? { search: params.search } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.urgentOnly ? { urgentOnly: 'true' } : {}),
      ...(params.page ? { page: params.page } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
    },
  });
  return data.data;
}
