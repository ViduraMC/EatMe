import type { DonationItem, UrgencyLevel } from '../types/donation';
import type { Tone } from '../theme';
import type { IconName } from '../components/Icon';

/**
 * Display helpers for how fresh an item is.
 *
 * The urgency LEVEL always comes from the server (item.urgencyLevel), per the
 * team rule that urgency logic lives only in urgency.service.ts. These
 * helpers only turn times into something visual: how full a freshness ring
 * is, and which icon and colour a level uses.
 */

const HOUR = 3_600_000;

/**
 * How much of an item's safe life is left, from 1 (just made) to 0 (expired).
 *
 * Prepared food: measured across its safe window after cooking.
 * Packaged food: measured from when it was listed to its expiry date, which
 * for long-life food is a long span, so the ring stays nearly full.
 */
export function freshnessFraction(
  item: Pick<DonationItem, 'category' | 'preparedAt' | 'effectiveExpiry' | 'createdAt'>,
  now: number,
): number {
  if (!item.effectiveExpiry) return 1;
  const end = new Date(item.effectiveExpiry).getTime();
  const startIso =
    item.category === 'prepared' && item.preparedAt ? item.preparedAt : item.createdAt;
  const start = new Date(startIso).getTime();
  const span = Math.max(end - start, HOUR);
  return Math.min(1, Math.max(0, (end - now) / span));
}

export function isExpired(expiry: string | null | undefined, now: number): boolean {
  return !!expiry && new Date(expiry).getTime() <= now;
}

export const urgencyTone: Record<UrgencyLevel, Tone> = {
  critical: 'critical',
  urgent: 'urgent',
  safe: 'safe',
};

/**
 * Icons differ by level as well as colour, so the three levels can be told
 * apart without colour vision: flame, clock, leaf.
 */
export const urgencyIcon: Record<UrgencyLevel, IconName> = {
  critical: 'mc:fire',
  urgent: 'time-outline',
  safe: 'leaf-outline',
};

/** Most urgent level across a listing's items: critical beats urgent beats safe. */
export function worstUrgency(levels: readonly UrgencyLevel[]): UrgencyLevel {
  if (levels.includes('critical')) return 'critical';
  if (levels.includes('urgent')) return 'urgent';
  return 'safe';
}
