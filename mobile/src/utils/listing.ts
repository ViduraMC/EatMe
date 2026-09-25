import type { Tone } from '../theme';
import type {
  DonationItem,
  DonationListing,
  ListingStatus,
  UrgencyLevel,
} from '../types/donation';
import { worstUrgency } from './freshness';

/** Open or partly claimed: still visible to recipients. */
export function isActiveListing(status: ListingStatus): boolean {
  return status === 'open' || status === 'partially_claimed';
}

export function isClosedListing(status: ListingStatus): boolean {
  return status === 'cancelled' || status === 'expired';
}

export const listingStatusTone: Record<ListingStatus, Tone> = {
  open: 'olive',
  partially_claimed: 'info',
  fully_claimed: 'brand',
  expired: 'neutral',
  cancelled: 'neutral',
};

/**
 * How much of a listing has been claimed, from 0 to 1.
 *
 * Items are in different units (servings, kg, loaves), so quantities cannot
 * be added together. Each item contributes the fraction of it that is
 * claimed, and the listing is the average of those.
 */
export function claimedFraction(items: readonly DonationItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    if (!quantity) return sum;
    return sum + (quantity - Number(item.quantityRemaining)) / quantity;
  }, 0);
  return Math.min(1, Math.max(0, total / items.length));
}

export function isClaimed(item: DonationItem): boolean {
  return Number(item.quantityRemaining) < Number(item.quantity);
}

/** The item a donor should act on first: soonest expiry among what is left. */
export function soonestItem(items: readonly DonationItem[]): DonationItem | null {
  const withStock = items.filter(
    (i) => Number(i.quantityRemaining) > 0 && i.effectiveExpiry,
  );
  const pool = withStock.length > 0 ? withStock : items.filter((i) => i.effectiveExpiry);
  return (
    [...pool].sort(
      (a, b) =>
        new Date(a.effectiveExpiry!).getTime() - new Date(b.effectiveExpiry!).getTime(),
    )[0] ?? null
  );
}

export function listingUrgency(listing: DonationListing): UrgencyLevel {
  return worstUrgency(listing.items.map((i) => i.urgencyLevel));
}

/** Food type icon, so a list can be scanned by shape as well as by name. */
export function itemIcon(item: Pick<DonationItem, 'category' | 'unit'>) {
  if (item.category === 'prepared') return 'mc:pot-steam-outline' as const;
  switch (item.unit) {
    case 'loaves':
      return 'mc:bread-slice-outline' as const;
    case 'litres':
      return 'mc:bottle-soda-classic-outline' as const;
    case 'cans':
      return 'mc:food-variant' as const;
    case 'kg':
      return 'mc:sack' as const;
    default:
      return 'mc:package-variant-closed' as const;
  }
}
