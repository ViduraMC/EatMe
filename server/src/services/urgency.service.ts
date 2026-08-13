import { Prisma, type ItemCategory } from '@prisma/client';
import { ApiError } from '../utils/apiError';

/**
 * Expiry and urgency rules. docs/03-database-design.md section 5.
 *
 * Everything that decides whether food is urgent lives in this one file, so
 * that the donor module (which writes items) and the recipient module (which
 * orders them) cannot drift apart.
 */

/** Packaged food becomes urgent this many hours before it expires. */
export const URGENT_WITHIN_HOURS = 48;

/** Any food this close to expiry is critical, and shown red in the app. */
export const CRITICAL_WITHIN_HOURS = 6;

const MS_PER_HOUR = 60 * 60 * 1000;

export type UrgencyLevel = 'critical' | 'urgent' | 'safe';

export interface ExpiryInput {
  category: ItemCategory;
  /** Packaged only. */
  expiryDate?: Date | null;
  /** Prepared only. */
  preparedAt?: Date | null;
  /** Prepared only. */
  safeWindowHours?: number | null;
}

export interface UrgencyResult {
  /** Written to DonationItem.computedExpiry. Null for packaged food. */
  computedExpiry: Date | null;
  /** The date urgency was actually measured against, whichever column that came from. */
  effectiveExpiry: Date;
  /** Written to DonationItem.isUrgent. */
  isUrgent: boolean;
  /** Not stored. Drives the colour of the pill in the app. */
  level: UrgencyLevel;
}

/**
 * Enforces the conditional NOT NULL that MySQL cannot express.
 *
 * A packaged item must carry expiryDate and must not carry the prepared
 * columns. A prepared item is the mirror image. Getting this wrong is the
 * easiest way to end up with an item that has no expiry at all, which would
 * then sort as "safe" forever.
 */
export function assertValidExpiryFields(input: ExpiryInput): void {
  const { category, expiryDate, preparedAt, safeWindowHours } = input;

  if (category === 'packaged') {
    if (!expiryDate) {
      throw ApiError.badRequest('A packaged item needs an expiry date');
    }
    if (preparedAt != null || safeWindowHours != null) {
      throw ApiError.badRequest(
        'A packaged item must not have preparedAt or safeWindowHours. Those are for prepared food.',
      );
    }
    return;
  }

  // prepared
  if (!preparedAt) {
    throw ApiError.badRequest('A prepared item needs the time it was prepared');
  }
  if (safeWindowHours == null) {
    throw ApiError.badRequest('A prepared item needs a safe window in hours');
  }
  if (safeWindowHours <= 0) {
    throw ApiError.badRequest('The safe window must be greater than zero hours');
  }
  if (expiryDate != null) {
    throw ApiError.badRequest(
      'A prepared item must not have an expiry date. It is derived from preparedAt plus the safe window.',
    );
  }
}

/** computed_expiry = prepared_at + safe_window_hours. Null for packaged food. */
export function computeExpiry(input: ExpiryInput): Date | null {
  if (input.category !== 'prepared') {
    return null;
  }
  if (!input.preparedAt || input.safeWindowHours == null) {
    return null;
  }
  return new Date(input.preparedAt.getTime() + input.safeWindowHours * MS_PER_HOUR);
}

/**
 * Works out the urgency of one item.
 *
 * The rules, in the order they are applied:
 *   1. anything within 6 hours of expiring is critical
 *   2. prepared food is always urgent, however long its safe window is
 *   3. packaged food is urgent within 48 hours of its expiry date
 *   4. anything else is safe
 *
 * Rule 2 is deliberately unconditional. Cooked food that has been standing is
 * the highest food safety risk in the system, so it always sorts to the top of
 * a recipient's browse list.
 */
export function evaluateUrgency(
  input: ExpiryInput,
  now: Date = new Date(),
): UrgencyResult {
  assertValidExpiryFields(input);

  const computedExpiry = computeExpiry(input);
  const effectiveExpiry =
    input.category === 'prepared' ? computedExpiry : input.expiryDate;

  if (!effectiveExpiry) {
    // assertValidExpiryFields guarantees this cannot happen. Guarding anyway,
    // because silently treating an item as safe would be the worst outcome.
    throw ApiError.badRequest('Could not determine an expiry for this item');
  }

  const hoursRemaining = (effectiveExpiry.getTime() - now.getTime()) / MS_PER_HOUR;

  let level: UrgencyLevel;
  if (hoursRemaining <= CRITICAL_WITHIN_HOURS) {
    level = 'critical';
  } else if (input.category === 'prepared') {
    level = 'urgent';
  } else if (hoursRemaining <= URGENT_WITHIN_HOURS) {
    level = 'urgent';
  } else {
    level = 'safe';
  }

  return {
    computedExpiry,
    effectiveExpiry,
    isUrgent: level !== 'safe',
    level,
  };
}

/**
 * The fields to write whenever a DonationItem is created or updated.
 *
 * Spread the result into the Prisma call:
 *
 *   await prisma.donationItem.create({
 *     data: { listingId, foodName, quantity, ...buildExpiryFields(input) },
 *   });
 *
 * Because isUrgent is a stored column it goes stale as time passes. It is
 * correct at write time, which is what browse ordering needs; a nightly or
 * on-read refresh is Sprint 4 work.
 */
export function buildExpiryFields(input: ExpiryInput, now: Date = new Date()) {
  const { computedExpiry, isUrgent } = evaluateUrgency(input, now);

  return {
    category: input.category,
    expiryDate: input.category === 'packaged' ? input.expiryDate! : null,
    preparedAt: input.category === 'prepared' ? input.preparedAt! : null,
    safeWindowHours: input.category === 'prepared' ? input.safeWindowHours! : null,
    computedExpiry,
    isUrgent,
  };
}

/**
 * How much of an item is left after a donor accepts a request for it.
 *
 * The rule, agreed at sign-off: quantity_remaining decrements on donor
 * ACCEPTANCE, never on request creation. A pending request must not reserve
 * stock, otherwise one recipient sitting on an unanswered request would block
 * everyone else from asking for the same food.
 *
 * Nothing in the shared foundation calls this yet. It lives here so that when
 * Vidura's accept endpoint and Haritha's request validation both need the rule,
 * they use the same one.
 */
export function quantityAfterAcceptance(
  quantityRemaining: Prisma.Decimal | number | string,
  quantityRequested: Prisma.Decimal | number | string,
): Prisma.Decimal {
  const remaining = new Prisma.Decimal(quantityRemaining);
  const requested = new Prisma.Decimal(quantityRequested);

  if (requested.lessThanOrEqualTo(0)) {
    throw ApiError.badRequest('The requested quantity must be greater than zero');
  }

  if (requested.greaterThan(remaining)) {
    throw ApiError.badRequest(
      `Only ${remaining.toString()} left, but ${requested.toString()} was requested`,
    );
  }

  return remaining.minus(requested);
}
