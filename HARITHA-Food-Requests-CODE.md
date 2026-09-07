# EatMe — Food Requests: Complete Code for Haritha

**Owner:** Haritha Cabraal · **Branch:** `feature/donation-request` (already created) · **Stories:** US-R01, US-R02

Every code block below has been **compiled and tested against the real database** before being written into this file. Server: 32 automated checks, 0 failures. Mobile: typechecks and the Android bundle builds. Copy them exactly.

---

## READ THIS FIRST — your scope changed

Two things are different from the earlier guide I sent you:

**1. You no longer build accept and reject.** Sprint 2 moved approval from the donor to the **Donation Coordinator**, who already owns matching and assignment. Kaushal absorbs it into US-C02. `PUT /requests/:id/accept` and `/reject` are **not yours**. Do not build them.

**2. You no longer build `/requests/incoming`.** Vidura's `GET /donations/requests/incoming` already gives the donor a read-only view of requests on their listings. Building a second endpoint for the same data would be duplication.

**Your endpoints are now just four:**

| Method | Endpoint                   | Role                                                 |
| ------ | -------------------------- | ---------------------------------------------------- |
| POST   | `/api/requests`            | Recipient                                            |
| GET    | `/api/requests/mine`       | Recipient                                            |
| GET    | `/api/requests/:id`        | Recipient who made it, or donor who owns the listing |
| PATCH  | `/api/requests/:id/cancel` | Recipient (own, while pending)                       |

Smaller scope, same story points. Spend the difference on the screens.

---

## Step 0 — Get the project running

If you have not set the project up yet, do **Part 0 of the first guide** first: clone, `npm install` at the root, `npm run install:all`, `npm run db:up`, `.env` files, `npm run db:migrate`, `npm run db:seed`, and **the two firewall rules** for ports 8081 and 5000.

Two reminders that cost hours if missed:

- **`DATABASE_URL` must use `127.0.0.1`, not `localhost`.** Prisma resolves `localhost` to `::1` and the container does not answer there.
- **Windows Firewall blocks your phone.** If Expo Go shows `java.io.IOException: Failed to download remote update`, that is the firewall, not your code.

---

## Step 1 — Sync your branch

Your branch exists but is **17 commits behind `dev`** and has no work on it. Everything you need — the shared middleware, the components, the browse API — is on `dev`. Get it first:

```bash
git checkout dev && git pull origin dev
```

```bash
git checkout feature/donation-request && git merge dev
```

```bash
npm run install:all
```

Then confirm you actually have the foundation:

```bash
npm run typecheck
```

If that passes, you are ready.

---

## Step 2 — What you must NOT change

- `docs/` — assignment artefacts, graded as written
- `mobile/src/screens/{donor,coordinator,driver,admin}/` — other people's modules
- `server/prisma/schema.prisma` — **the Request tables already exist. You do not need a migration.**
- `server/src/services/urgency.service.ts` and `donation.service.ts` — import from them, never edit
- `mobile/src/components/`, `constants/theme.ts`, `api/client.ts`, `context/AuthContext.tsx` — shared
- In `navigation/types.ts` and `RootNavigator.tsx`, touch **only** the recipient parts

---

# SERVER

## File 1 of 9 — `server/src/services/request.service.ts`

**New file.** All the business logic. The three rules that matter are commented inline: stock does not move on creation, requested items must belong to the listing, and a non-owner gets 404 rather than 403.

```ts
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

/**
 * The recipient withdraws a request they no longer need.
 *
 * Only while still pending. Once the coordinator has accepted or rejected it,
 * the outcome is recorded and cancelling would rewrite history. Nothing is
 * deleted; the row stays with status cancelled.
 */
export async function cancelRequest(
  requestId: number,
  recipientId: number,
): Promise<RequestWithItems> {
  const request = await prisma.donationRequest.findUnique({
    where: { requestId },
    select: { requestId: true, recipientId: true, status: true },
  });

  if (!request || request.recipientId !== recipientId) {
    throw ApiError.notFound('That request does not exist');
  }

  if (request.status === 'cancelled') {
    // Already in the target state. Returning it rather than erroring keeps the
    // endpoint idempotent, so a double tap on a slow connection is harmless.
    return prisma.donationRequest.findUniqueOrThrow({
      where: { requestId },
      include: requestInclude,
    });
  }

  if (request.status !== 'pending') {
    throw ApiError.badRequest(
      `This request was already ${request.status} and can no longer be cancelled`,
    );
  }

  return prisma.donationRequest.update({
    where: { requestId },
    data: { status: 'cancelled' },
    include: requestInclude,
  });
}

/**
 * Recomputes a listing's status from what is left of its items.
 *
 * Not called from this module today, because the donor no longer accepts
 * requests and the coordinator owns acceptance. It is exported here so that
 * when Kaushal's accept handler decrements stock, it can reuse the same
 * derivation rather than writing a second version of it.
 */
export async function refreshListingStatus(listingId: number): Promise<void> {
  const listing = await prisma.donationListing.findUnique({
    where: { listingId },
    include: { items: { select: { quantity: true, quantityRemaining: true } } },
  });

  if (!listing) return;

  const next = deriveListingStatus(listing.items, listing.status);
  if (next !== listing.status) {
    await prisma.donationListing.update({
      where: { listingId },
      data: { status: next },
    });
  }
}
```

---

## File 2 of 9 — `server/src/controllers/request.controller.ts`

**New file.** Thin handlers plus the zod schemas. The duplicate-item check is here so the user gets a readable message instead of the database's opaque 409.

```ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/apiError';
import { sendSuccess } from '../utils/apiResponse';
import * as requestService from '../services/request.service';

/**
 * Food Requests controllers. Owner: Haritha.
 *
 * Thin: validate, call the service, send the envelope. Business rules live in
 * services/request.service.ts.
 */

export const createRequestSchema = z
  .object({
    listingId: z.coerce.number().int().positive('Choose a listing'),
    message: z
      .string()
      .trim()
      .max(500, 'Keep the message under 500 characters')
      .optional()
      .nullable(),
    items: z
      .array(
        z.object({
          itemId: z.coerce.number().int().positive(),
          quantityRequested: z.coerce
            .number()
            .positive('Ask for more than zero')
            .max(999999),
        }),
      )
      .min(1, 'Choose at least one item')
      .max(20, 'A request can hold at most 20 items'),
  })
  .superRefine((value, ctx) => {
    // The database enforces UNIQUE (request_id, item_id). Catching it here
    // gives a readable message instead of an opaque 409.
    const seen = new Set<number>();
    value.items.forEach((item, index) => {
      if (seen.has(item.itemId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'itemId'],
          message: 'That item is already in this request',
        });
      }
      seen.add(item.itemId);
    });
  });

const listQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']).optional(),
});

/** Parses :id and rejects anything that is not a positive integer. */
function parseRequestId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest('That request id is not valid');
  }
  return id;
}

/** POST /api/requests */
export async function createRequest(req: Request, res: Response): Promise<void> {
  const input = req.body as z.infer<typeof createRequestSchema>;

  const request = await requestService.createRequest(req.user!.userId, {
    listingId: input.listingId,
    message: input.message ?? null,
    items: input.items,
  });

  sendSuccess(res, { request }, 201);
}

/** GET /api/requests/mine */
export async function listMyRequests(req: Request, res: Response): Promise<void> {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid filter', parsed.error.flatten().fieldErrors);
  }

  const requests = await requestService.listMyRequests(
    req.user!.userId,
    parsed.data.status,
  );
  sendSuccess(res, { requests });
}

/** GET /api/requests/:id */
export async function getRequest(req: Request, res: Response): Promise<void> {
  const request = await requestService.getRequestById(parseRequestId(req), {
    userId: req.user!.userId,
    role: req.user!.role,
  });
  sendSuccess(res, { request });
}

/** PATCH /api/requests/:id/cancel */
export async function cancelRequest(req: Request, res: Response): Promise<void> {
  const request = await requestService.cancelRequest(
    parseRequestId(req),
    req.user!.userId,
  );
  sendSuccess(res, { request });
}
```

---

## File 3 of 9 — `server/src/routes/requests.routes.ts`

**New file.** Note `/mine` is declared **before** `/:id` — Express matches in order and would otherwise read `mine` as an id.

```ts
import { Router } from 'express';
import {
  cancelRequest,
  createRequest,
  createRequestSchema,
  getRequest,
  listMyRequests,
} from '../controllers/request.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * /api/requests — Food Requests. Owner: Haritha.
 * Endpoint contract: docs/05-api-plan.md.
 *
 * Accepting and rejecting are NOT here. Sprint 2 moved approval to the
 * Donation Coordinator, who already owns matching and assignment, so those
 * endpoints belong to the coordinator module.
 */
const router = Router();

router.use(authenticate);

// Order matters: /mine must be declared before /:id, otherwise Express matches
// "mine" as an id and the request 400s on a non-numeric id.
router.get('/mine', requireRole('recipient'), asyncHandler(listMyRequests));

router.post(
  '/',
  requireRole('recipient'),
  validateBody(createRequestSchema),
  asyncHandler(createRequest),
);

// No role guard: the service decides, because both the recipient who made the
// request and the donor whose listing it is are allowed to read it.
router.get('/:id', asyncHandler(getRequest));

router.patch('/:id/cancel', requireRole('recipient'), asyncHandler(cancelRequest));

export default router;
```

---

## File 4 of 9 — `server/src/routes/index.ts`

**Existing file, two small edits.**

Add the import next to the others at the top:

```ts
import requestRoutes from './requests.routes';
```

Add the mount directly under the donations one:

```ts
router.use('/donations', donationRoutes);
router.use('/requests', requestRoutes);
```

Then delete this line from the comment block below it, since it is now done:

```
 *   router.use('/requests',    requestRoutes);    // Haritha
```

---

# MOBILE

## File 5 of 9 — `mobile/src/types/request.ts`

**New file.** Note `quantityRequested` is a **string**: Prisma serialises Decimal as a string over JSON. Parse it with `Number()` where you use it.

```ts
/**
 * Food Requests types. Mirrors what /api/requests returns.
 *
 * Prisma serialises Decimal as a string over JSON, so quantity fields are
 * strings here, not numbers. Parse them with Number() at the point of use.
 */

import type { ItemCategory, ItemUnit, ListingStatus } from './donation';
import type { User } from './index';

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
  recipient: User;
  items: RequestedItem[];
}

export interface CreateRequestPayload {
  listingId: number;
  message?: string | null;
  items: Array<{ itemId: number; quantityRequested: number }>;
}
```

---

## File 6 of 9 — `mobile/src/api/requests.api.ts`

**New file.** There is deliberately no accept or reject function — leaving them out means a screen cannot casually call one.

```ts
import { api } from './client';
import type { ApiSuccess } from '../types';
import type {
  CreateRequestPayload,
  DonationRequest,
  RequestStatus,
} from '../types/request';

/**
 * /api/requests — Food Requests. Owner: Haritha.
 *
 * There is deliberately no accept or reject function here. Sprint 2 moved
 * approval to the Donation Coordinator, so those belong to the coordinator
 * module. Leaving them out means a recipient screen cannot casually call one.
 */

export async function createRequest(
  payload: CreateRequestPayload,
): Promise<DonationRequest> {
  const { data } = await api.post<ApiSuccess<{ request: DonationRequest }>>(
    '/requests',
    payload,
  );
  return data.data.request;
}

/** The signed-in recipient's own requests, newest first. */
export async function fetchMyRequests(
  status?: RequestStatus,
): Promise<DonationRequest[]> {
  const { data } = await api.get<ApiSuccess<{ requests: DonationRequest[] }>>(
    '/requests/mine',
    { params: status ? { status } : {} },
  );
  return data.data.requests;
}

export async function fetchRequest(requestId: number): Promise<DonationRequest> {
  const { data } = await api.get<ApiSuccess<{ request: DonationRequest }>>(
    `/requests/${requestId}`,
  );
  return data.data.request;
}

/** Withdraw a request. Only works while it is still pending. */
export async function cancelRequest(requestId: number): Promise<DonationRequest> {
  const { data } = await api.patch<ApiSuccess<{ request: DonationRequest }>>(
    `/requests/${requestId}/cancel`,
  );
  return data.data.request;
}
```

---

## File 7 of 9 — `mobile/src/screens/recipient/BrowseListingsScreen.tsx`

**New file. This is US-R01, your Sprint 1 deliverable.**

The API already returns listings urgent-first with expired food excluded, so this screen **never re-sorts**. The search box is debounced at 350ms so typing does not fire a request per keystroke.

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Card, EmptyState, Input, ScreenContainer, StatusPill } from '../../components';
import { browseListings } from '../../api/donations.api';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import { formatTimeUntil } from '../../utils/datetime';
import type { DonationListing, ItemCategory, UrgencyLevel } from '../../types/donation';
import type { RecipientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RecipientStackParamList, 'BrowseListings'>;

/** The most pressing item in a listing decides the colour of its pill. */
function worstUrgency(listing: DonationListing): UrgencyLevel {
  if (listing.items.some((i) => i.urgencyLevel === 'critical')) return 'critical';
  if (listing.items.some((i) => i.urgencyLevel === 'urgent')) return 'urgent';
  return 'safe';
}

/** The soonest expiry across the listing, which is what a recipient acts on. */
function soonestExpiry(listing: DonationListing): string | null {
  const dates = listing.items
    .map((i) => i.effectiveExpiry)
    .filter((d): d is string => !!d)
    .sort();
  return dates[0] ?? null;
}

/**
 * US-R01: browse available food.
 *
 * The API does the ordering and filtering. Listings arrive urgent first then
 * by soonest expiry, with expired food and empty items already excluded, so
 * this screen never re-sorts: doing so would fight the server's ordering and
 * break pagination.
 */
export function BrowseListingsScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  const [listings, setListings] = useState<DonationListing[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (
      term: string,
      cat: ItemCategory | null,
      urgent: boolean,
      isRefresh = false,
    ) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        const result = await browseListings({
          search: term.trim() || undefined,
          category: cat ?? undefined,
          urgentOnly: urgent || undefined,
          limit: 50,
        });
        setListings(result.listings);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  /*
   * Debounced so typing does not fire a request per keystroke. 350ms is long
   * enough to finish a word and short enough not to feel laggy.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      void load(search, category, urgentOnly);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, category, urgentOnly, load]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{user?.organisationName ?? user?.name}</Text>
          <Text style={styles.subtitle}>Available food near you</Text>
        </View>
        <Pressable onPress={() => void logout()} accessibilityRole="button">
          <Text style={styles.logout}>Log Out</Text>
        </Pressable>
      </View>

      <Input
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Bread, rice, curry..."
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setUrgentOnly((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: urgentOnly }}
          style={[styles.chip, urgentOnly && styles.chipOn]}
        >
          <Text style={[styles.chipText, urgentOnly && styles.chipTextOn]}>
            Urgent only
          </Text>
        </Pressable>

        {(['packaged', 'prepared'] as ItemCategory[]).map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory((current) => (current === c ? null : c))}
            accessibilityRole="radio"
            accessibilityState={{ selected: category === c }}
            style={[styles.chip, category === c && styles.chipOn]}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextOn]}>
              {c}
            </Text>
          </Pressable>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => String(l.listingId)}
          refreshing={refreshing}
          onRefresh={() => void load(search, category, urgentOnly, true)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={listings.length === 0 ? styles.emptyWrap : undefined}
          ListEmptyComponent={
            <EmptyState
              title={
                search || category || urgentOnly ? 'Nothing matches' : 'No food available'
              }
              message={
                search || category || urgentOnly
                  ? 'Try clearing the search or the filters.'
                  : 'When a donor posts surplus food, it appears here with the most urgent first.'
              }
            />
          }
          renderItem={({ item }) => {
            const urgency = worstUrgency(item);
            const expiry = soonestExpiry(item);

            return (
              <Card
                onPress={() =>
                  navigation.navigate('ListingDetail', { listingId: item.listingId })
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <StatusPill label={urgency} tone={urgency} />
                </View>

                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.donor.organisationName ?? item.donor.name}
                </Text>

                <Text style={styles.cardMeta}>
                  {item.items.length} item{item.items.length === 1 ? '' : 's'}
                  {expiry ? ` · soonest expires ${formatTimeUntil(expiry)}` : ''}
                </Text>

                <Text style={styles.cardItems} numberOfLines={2}>
                  {item.items.map((i) => i.foodName).join(', ')}
                </Text>
              </Card>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerText: { flexShrink: 1 },
  greeting: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  subtitle: { fontSize: fontSize.secondary, color: colours.textSecondary },
  logout: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textSecondary,
    paddingVertical: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.radius,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    backgroundColor: colours.background,
  },
  chipOn: { borderColor: colours.accent, backgroundColor: colours.surface },
  chipText: { fontSize: fontSize.secondary, color: colours.textSecondary },
  chipTextOn: { color: colours.accent, fontWeight: fontWeight.semibold },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  cardMeta: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    lineHeight: 20,
  },
  cardItems: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
});
```

---

## File 8 of 9 — `mobile/src/screens/recipient/ListingDetailScreen.tsx`

**New file.** Unlike browse, this endpoint returns a listing whatever its status, so the request button is hidden when the listing is closed or out of stock.

```tsx
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, ScreenContainer, StatusPill } from '../../components';
import { fetchListing } from '../../api/donations.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { formatDateTime, formatStatus, formatTimeUntil } from '../../utils/datetime';
import type { DonationListing } from '../../types/donation';
import type { RecipientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RecipientStackParamList, 'ListingDetail'>;

export function ListingDetailScreen({ navigation, route }: Props) {
  const { listingId } = route.params;
  const [listing, setListing] = useState<DonationListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setListing(await fetchListing(listingId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (!listing) {
    return (
      <ScreenContainer>
        <Text style={styles.error}>{error ?? 'That listing could not be loaded'}</Text>
        <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  /*
   * Detail returns a listing whatever its status, unlike browse. A listing
   * that has been cancelled or fully claimed since the list was loaded must
   * not offer a request button.
   */
  const canRequest = listing.status === 'open' || listing.status === 'partially_claimed';
  const hasStock = listing.items.some((i) => Number(i.quantityRemaining) > 0);

  return (
    <ScreenContainer scroll>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{listing.title}</Text>
        <StatusPill label={formatStatus(listing.status)} tone="neutral" />
      </View>

      <Text style={styles.donor}>
        {listing.donor.organisationName ?? listing.donor.name}
      </Text>

      {!!listing.description && (
        <Text style={styles.description}>{listing.description}</Text>
      )}

      <Card style={styles.card}>
        <Text style={styles.cardHeading}>Collection</Text>
        <Text style={styles.body}>{listing.pickupAddress}</Text>
        <Text style={styles.meta}>
          {formatDateTime(listing.pickupWindowStart)} to{' '}
          {formatDateTime(listing.pickupWindowEnd)}
        </Text>
      </Card>

      <Text style={styles.sectionHeading}>Available items</Text>

      {listing.items.map((item) => {
        const remaining = Number(item.quantityRemaining);
        return (
          <Card key={item.itemId}>
            <View style={styles.itemTop}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.foodName}
              </Text>
              <StatusPill label={item.urgencyLevel} tone={item.urgencyLevel} />
            </View>

            <Text style={styles.meta}>
              {remaining > 0
                ? `${item.quantityRemaining} ${item.unit} available`
                : 'None left'}
            </Text>
            <Text style={styles.meta}>
              {item.category} · {item.storageType}
            </Text>
            <Text style={[styles.expiry, styles[item.urgencyLevel]]}>
              Expires {formatTimeUntil(item.effectiveExpiry)}
            </Text>
          </Card>
        );
      })}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {canRequest && hasStock ? (
        <Button
          label="Request This Food"
          onPress={() => navigation.navigate('CreateRequest', { listingId })}
          style={styles.request}
        />
      ) : (
        <Text style={styles.closedNote}>
          {canRequest
            ? 'Every item on this listing has been claimed.'
            : 'This listing is no longer accepting requests.'}
        </Text>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  donor: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.xs,
  },
  description: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  card: { marginTop: spacing.md },
  cardHeading: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  itemName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  body: { fontSize: fontSize.body, color: colours.textPrimary },
  meta: { fontSize: fontSize.secondary, color: colours.textSecondary, lineHeight: 20 },
  expiry: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  critical: { color: colours.critical },
  urgent: { color: colours.urgent },
  safe: { color: colours.safe },
  request: { marginTop: spacing.lg },
  closedNote: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.lg,
    lineHeight: 20,
  },
  error: { color: colours.critical, fontSize: fontSize.secondary, marginTop: spacing.md },
});
```

---

## File 9a — `mobile/src/screens/recipient/CreateRequestScreen.tsx`

**New file.** The quantity stepper is **capped at `quantityRemaining`**, so a recipient cannot enter a number the server will reject.

```tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Input, ScreenContainer, StatusPill } from '../../components';
import { fetchListing } from '../../api/donations.api';
import { createRequest } from '../../api/requests.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import { formatTimeUntil } from '../../utils/datetime';
import type { DonationListing } from '../../types/donation';
import type { RecipientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RecipientStackParamList, 'CreateRequest'>;

/**
 * A quantity stepper capped at what is actually left.
 *
 * Capping in the UI rather than only validating on submit means a recipient
 * cannot enter a number the server is going to reject.
 */
function Stepper({
  value,
  max,
  unit,
  onChange,
}: {
  value: number;
  max: number;
  unit: string;
  onChange: (next: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        style={[styles.stepButton, value <= 0 && styles.stepButtonOff]}
      >
        <Text style={styles.stepText}>−</Text>
      </Pressable>

      <Text style={styles.stepValue}>
        {value} {unit}
      </Text>

      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        style={[styles.stepButton, value >= max && styles.stepButtonOff]}
      >
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

/**
 * US-R02: choose what you need from a listing and submit a request.
 *
 * Nothing is reserved by submitting. Stock only moves when the Donation
 * Coordinator accepts, so another recipient can still ask for the same food
 * while this request is pending.
 */
export function CreateRequestScreen({ navigation, route }: Props) {
  const { listingId } = route.params;

  const [listing, setListing] = useState<DonationListing | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setListing(await fetchListing(listingId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const chosen = useMemo(
    () =>
      Object.entries(quantities)
        .map(([itemId, quantityRequested]) => ({
          itemId: Number(itemId),
          quantityRequested,
        }))
        .filter((i) => i.quantityRequested > 0),
    [quantities],
  );

  async function handleSubmit() {
    if (chosen.length === 0) {
      setError('Choose at least one item before submitting');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createRequest({
        listingId,
        message: message.trim() || null,
        items: chosen,
      });

      Alert.alert(
        'Request sent',
        'The Donation Coordinator will review it. You can follow its status under My Requests.',
      );
      navigation.navigate('MyRequests');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (!listing) {
    return (
      <ScreenContainer>
        <Text style={styles.error}>{error ?? 'That listing could not be loaded'}</Text>
        <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const available = listing.items.filter((i) => Number(i.quantityRemaining) > 0);

  return (
    <ScreenContainer scroll avoidKeyboard>
      <Text style={styles.heading}>Choose what you need</Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {listing.title}
      </Text>

      {available.map((item) => {
        const max = Math.floor(Number(item.quantityRemaining));
        const value = quantities[item.itemId] ?? 0;

        return (
          <Card key={item.itemId}>
            <View style={styles.itemTop}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.foodName}
              </Text>
              <StatusPill label={item.urgencyLevel} tone={item.urgencyLevel} />
            </View>

            <Text style={styles.meta}>
              {item.quantityRemaining} {item.unit} available · expires{' '}
              {formatTimeUntil(item.effectiveExpiry)}
            </Text>

            <Stepper
              value={value}
              max={max}
              unit={item.unit}
              onChange={(next) => setQuantities((q) => ({ ...q, [item.itemId]: next }))}
            />
          </Card>
        );
      })}

      <Input
        label="Message to the donor (optional)"
        value={message}
        onChangeText={setMessage}
        placeholder="We can collect this evening for 30 children."
        multiline
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.note}>
        Submitting does not reserve the food. The Donation Coordinator reviews every
        request.
      </Text>

      <Button
        label={
          chosen.length === 0
            ? 'Submit Request'
            : `Submit Request (${chosen.length} item${chosen.length === 1 ? '' : 's'})`
        }
        onPress={handleSubmit}
        loading={submitting}
        disabled={chosen.length === 0}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  itemName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  meta: { fontSize: fontSize.secondary, color: colours.textSecondary, lineHeight: 20 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: layout.radius,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonOff: { opacity: 0.4 },
  stepText: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  stepValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },
  note: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
});
```

---

## File 9b — `mobile/src/screens/recipient/MyRequestsScreen.tsx`

**New file.** Status filter chips, and a Withdraw button that only appears while a request is still pending.

```tsx
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, EmptyState, ScreenContainer, StatusPill } from '../../components';
import { cancelRequest, fetchMyRequests } from '../../api/requests.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import { formatDateTime, formatStatus } from '../../utils/datetime';
import type { DonationRequest, RequestStatus } from '../../types/request';
import type { RecipientStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RecipientStackParamList, 'MyRequests'>;

type Filter = 'all' | RequestStatus;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

function toneFor(status: RequestStatus): 'safe' | 'critical' | 'neutral' {
  if (status === 'accepted') return 'safe';
  if (status === 'rejected') return 'critical';
  return 'neutral';
}

export function MyRequestsScreen({ navigation }: Props) {
  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (current: Filter, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setRequests(await fetchMyRequests(current === 'all' ? undefined : current));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(filter);
    }, [load, filter]),
  );

  function changeFilter(next: Filter) {
    setFilter(next);
    setLoading(true);
    void load(next);
  }

  function confirmCancel(request: DonationRequest) {
    Alert.alert(
      'Withdraw this request?',
      'The donor and the coordinator will no longer see it. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => void doCancel(request.requestId),
        },
      ],
    );
  }

  async function doCancel(requestId: number) {
    setCancellingId(requestId);
    setError(null);
    try {
      await cancelRequest(requestId);
      await load(filter);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.heading}>My requests</Text>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => changeFilter(f.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: filter === f.value }}
            style={[styles.chip, filter === f.value && styles.chipOn]}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextOn]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => String(r.requestId)}
          refreshing={refreshing}
          onRefresh={() => void load(filter, true)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={requests.length === 0 ? styles.emptyWrap : undefined}
          ListEmptyComponent={
            <EmptyState
              title={filter === 'all' ? 'No requests yet' : `No ${filter} requests`}
              message={
                filter === 'all'
                  ? 'Browse available food and ask for what your organisation needs.'
                  : 'Try a different filter to see your other requests.'
              }
              actionLabel={filter === 'all' ? 'Browse food' : undefined}
              onAction={
                filter === 'all' ? () => navigation.navigate('BrowseListings') : undefined
              }
            />
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.listing.title}
                </Text>
                <StatusPill
                  label={formatStatus(item.status)}
                  tone={toneFor(item.status)}
                />
              </View>

              <Text style={styles.meta} numberOfLines={1}>
                {item.listing.donor.organisationName ?? item.listing.donor.name}
              </Text>

              <View style={styles.items}>
                {item.items.map((requested) => (
                  <Text key={requested.requestItemId} style={styles.itemLine}>
                    {'•'} {requested.quantityRequested} {requested.item.unit}{' '}
                    {requested.item.foodName}
                  </Text>
                ))}
              </View>

              {!!item.message && <Text style={styles.message}>“{item.message}”</Text>}

              {item.status === 'rejected' && !!item.rejectionReason && (
                <Text style={styles.rejection}>Reason: {item.rejectionReason}</Text>
              )}

              {item.status === 'accepted' && (
                <Text style={styles.accepted}>
                  Accepted. Collect from {item.listing.pickupAddress}, between{' '}
                  {formatDateTime(item.listing.pickupWindowStart)} and{' '}
                  {formatDateTime(item.listing.pickupWindowEnd)}.
                </Text>
              )}

              <Text style={styles.sent}>Sent {formatDateTime(item.createdAt)}</Text>

              {item.status === 'pending' && (
                <Button
                  label="Withdraw request"
                  variant="secondary"
                  onPress={() => confirmCancel(item)}
                  loading={cancellingId === item.requestId}
                  style={styles.cancelButton}
                />
              )}
            </Card>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.radius,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    backgroundColor: colours.background,
  },
  chipOn: { borderColor: colours.accent, backgroundColor: colours.surface },
  chipText: { fontSize: fontSize.secondary, color: colours.textSecondary },
  chipTextOn: { color: colours.accent, fontWeight: fontWeight.semibold },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  meta: { fontSize: fontSize.secondary, color: colours.textSecondary, lineHeight: 20 },
  items: { marginTop: spacing.xs },
  itemLine: { fontSize: fontSize.secondary, color: colours.textPrimary, lineHeight: 20 },
  message: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  rejection: {
    fontSize: fontSize.secondary,
    color: colours.critical,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  accepted: {
    fontSize: fontSize.secondary,
    color: colours.accent,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  sent: { fontSize: fontSize.label, color: colours.textSecondary, marginTop: spacing.sm },
  cancelButton: { marginTop: spacing.sm },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
});
```

---

## File 10 — `mobile/src/navigation/types.ts`

**Existing shared file. Change ONLY your own list.** Replace the `RecipientStackParamList` block with this and leave every other list exactly as it is:

```ts
/** Haritha. Food Requests. */
export type RecipientStackParamList = {
  BrowseListings: undefined;
  ListingDetail: { listingId: number };
  CreateRequest: { listingId: number };
  MyRequests: undefined;
};
```

---

## File 11 — `mobile/src/navigation/RootNavigator.tsx`

**Existing shared file. Change ONLY the recipient parts.**

Replace this import line:

```ts
import { RecipientHomeScreen } from '../screens/recipient/RecipientHomeScreen';
```

with these four:

```ts
import { BrowseListingsScreen } from '../screens/recipient/BrowseListingsScreen';
import { ListingDetailScreen as RecipientListingDetailScreen } from '../screens/recipient/ListingDetailScreen';
import { CreateRequestScreen } from '../screens/recipient/CreateRequestScreen';
import { MyRequestsScreen } from '../screens/recipient/MyRequestsScreen';
```

> The `as RecipientListingDetailScreen` alias matters: the donor module already imports a `ListingDetailScreen` into this same file, and without the alias the two collide.

Then replace the whole `RecipientNavigator` function with:

```tsx
/** Food Requests. Owner: Haritha. */
function RecipientNavigator() {
  return (
    <RecipientStack.Navigator screenOptions={screenOptions}>
      <RecipientStack.Screen
        name="BrowseListings"
        component={BrowseListingsScreen}
        options={{ title: 'Available Food' }}
      />
      <RecipientStack.Screen
        name="ListingDetail"
        component={RecipientListingDetailScreen}
        options={{ title: 'Listing' }}
      />
      <RecipientStack.Screen
        name="CreateRequest"
        component={CreateRequestScreen}
        options={{ title: 'Request Food' }}
      />
      <RecipientStack.Screen
        name="MyRequests"
        component={MyRequestsScreen}
        options={{ title: 'My Requests' }}
      />
    </RecipientStack.Navigator>
  );
}
```

Do not touch `DonorNavigator`, `CoordinatorNavigator`, `DriverNavigator` or `AdminNavigator`.

---

## File 12 — delete the stub

```bash
rm mobile/src/screens/recipient/RecipientHomeScreen.tsx
```

Nothing imports it once step 11 is done.

---

# VERIFY

## 1. It compiles

```bash
npm run typecheck
```

```bash
npm run lint
```

Both must pass before you commit. There is no ESLint in this project; `lint` is Prettier plus TypeScript.

## 2. Test the endpoints against the real database

Save this as `server/request.e2e.temp.ts`, run it, then **delete it**. Do not commit it — there is no test framework in this project by team decision.

```ts
/** Temporary verification of the request endpoints. Not committed. */
import { app } from './src/app';
import { prisma } from './src/config/prisma';

const BASE = 'http://127.0.0.1:5197/api';
let pass = 0,
  fail = 0;
const check = (l: string, ok: boolean, d = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${l}${ok || !d ? '' : '\n        ' + d}`);
};

async function req(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as any };
}
async function login(email: string) {
  const r = await req('POST', '/auth/login', undefined, { email, password: 'Test@1234' });
  if (r.status !== 200) throw new Error(`login ${email}: ${r.status}`);
  return r.body.data.token as string;
}

async function main() {
  const recipient = await login('recipient@eatme.lk');
  const otherRecipient = await login('elders@eatme.lk');

  const browse = await req('GET', '/donations?limit=20', recipient);
  check('browse works (US-R01 API already exists)', browse.status === 200);
  const listing = browse.body.data.listings.find((l: any) => l.items.length > 0);
  const item = listing.items[0];
  // log in as the donor who ACTUALLY owns this listing
  const donorEmail = (
    await prisma.user.findUniqueOrThrow({ where: { userId: listing.donorId } })
  ).email;
  const donorToken = await login(donorEmail);

  const created = await req('POST', '/requests', recipient, {
    listingId: listing.listingId,
    message: 'HARITHA TEST request',
    items: [{ itemId: item.itemId, quantityRequested: 1 }],
  });
  check(
    'recipient creates a request -> 201',
    created.status === 201,
    JSON.stringify(created.body).slice(0, 250),
  );
  const requestId = created.body.data?.request?.requestId;
  check('new request is pending', created.body.data?.request?.status === 'pending');
  check(
    'response carries the listing and donor',
    !!created.body.data?.request?.listing?.donor?.organisationName,
  );
  check(
    'response carries items with food names',
    !!created.body.data?.request?.items?.[0]?.item?.foodName,
  );
  check('no password hash leaks', !JSON.stringify(created.body).includes('passwordHash'));

  // THE most important rule in this module
  const afterCreate = await prisma.donationItem.findUniqueOrThrow({
    where: { itemId: item.itemId },
  });
  check(
    'creating a request does NOT move quantityRemaining',
    String(afterCreate.quantityRemaining) === String(item.quantityRemaining),
    `was ${item.quantityRemaining}, now ${afterCreate.quantityRemaining}`,
  );

  check(
    'donor cannot create a request (403)',
    (
      await req('POST', '/requests', donorToken, {
        listingId: listing.listingId,
        items: [{ itemId: item.itemId, quantityRequested: 1 }],
      })
    ).status === 403,
  );
  check(
    'donor cannot read /mine (403)',
    (await req('GET', '/requests/mine', donorToken)).status === 403,
  );
  check('no token -> 401', (await req('GET', '/requests/mine')).status === 401);

  check(
    'more than remaining -> 400',
    (
      await req('POST', '/requests', recipient, {
        listingId: listing.listingId,
        items: [{ itemId: item.itemId, quantityRequested: 999999 }],
      })
    ).status === 400,
  );
  check(
    'duplicate item -> 400',
    (
      await req('POST', '/requests', recipient, {
        listingId: listing.listingId,
        items: [
          { itemId: item.itemId, quantityRequested: 1 },
          { itemId: item.itemId, quantityRequested: 1 },
        ],
      })
    ).status === 400,
  );
  check(
    'zero items -> 400',
    (
      await req('POST', '/requests', recipient, {
        listingId: listing.listingId,
        items: [],
      })
    ).status === 400,
  );
  check(
    'item from another listing -> 400',
    (
      await req('POST', '/requests', recipient, {
        listingId: listing.listingId,
        items: [{ itemId: 999999, quantityRequested: 1 }],
      })
    ).status === 400,
  );
  check(
    'unknown listing -> 404',
    (
      await req('POST', '/requests', recipient, {
        listingId: 999999,
        items: [{ itemId: item.itemId, quantityRequested: 1 }],
      })
    ).status === 404,
  );
  check(
    'negative quantity -> 400',
    (
      await req('POST', '/requests', recipient, {
        listingId: listing.listingId,
        items: [{ itemId: item.itemId, quantityRequested: -3 }],
      })
    ).status === 400,
  );

  const mine = await req('GET', '/requests/mine', recipient);
  check(
    'appears in /mine',
    mine.body.data?.requests?.some((r: any) => r.requestId === requestId),
  );
  check(
    'another recipient does NOT see it',
    !(await req('GET', '/requests/mine', otherRecipient)).body.data?.requests?.some(
      (r: any) => r.requestId === requestId,
    ),
  );
  check(
    'status filter works',
    (
      await req('GET', '/requests/mine?status=pending', recipient)
    ).body.data?.requests?.every((r: any) => r.status === 'pending'),
  );
  check(
    'bad status value -> 400',
    (await req('GET', '/requests/mine?status=nonsense', recipient)).status === 400,
  );

  check(
    'recipient reads their own by id',
    (await req('GET', `/requests/${requestId}`, recipient)).status === 200,
  );
  check(
    'the donor who owns the listing can read it',
    (await req('GET', `/requests/${requestId}`, donorToken)).status === 200,
  );
  check(
    'an unrelated recipient gets 404 not 403',
    (await req('GET', `/requests/${requestId}`, otherRecipient)).status === 404,
  );
  check(
    'unknown id -> 404',
    (await req('GET', '/requests/9999999', recipient)).status === 404,
  );
  check(
    'non-numeric id -> 400',
    (await req('GET', '/requests/abc', recipient)).status === 400,
  );

  check(
    'another recipient cannot cancel it (404)',
    (await req('PATCH', `/requests/${requestId}/cancel`, otherRecipient)).status === 404,
  );
  const cancelled = await req('PATCH', `/requests/${requestId}/cancel`, recipient);
  check(
    'recipient cancels -> 200 and status cancelled',
    cancelled.status === 200 && cancelled.body.data?.request?.status === 'cancelled',
  );
  check(
    'the row still exists',
    !!(await prisma.donationRequest.findUnique({ where: { requestId } })),
  );
  check(
    'cancelling twice is idempotent',
    (await req('PATCH', `/requests/${requestId}/cancel`, recipient)).status === 200,
  );

  const acceptedReq = await prisma.donationRequest.findFirst({
    where: { status: 'accepted' },
  });
  if (acceptedReq) {
    const asOwner = await login(
      (
        await prisma.user.findUniqueOrThrow({
          where: { userId: acceptedReq.recipientId },
        })
      ).email,
    );
    check(
      'an accepted request cannot be cancelled -> 400',
      (await req('PATCH', `/requests/${acceptedReq.requestId}/cancel`, asOwner))
        .status === 400,
    );
  }

  check(
    'there is no accept endpoint in this module (404)',
    (await req('PUT', `/requests/${requestId}/accept`, donorToken, {})).status === 404,
  );
  check(
    'there is no reject endpoint in this module (404)',
    (await req('PUT', `/requests/${requestId}/reject`, donorToken, { reason: 'x' }))
      .status === 404,
  );

  await prisma.donationRequestItem.deleteMany({
    where: { request: { message: 'HARITHA TEST request' } },
  });
  await prisma.donationRequest.deleteMany({ where: { message: 'HARITHA TEST request' } });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

const server = app.listen(5197, '127.0.0.1', () => {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
});
server.unref();
```

Run it:

```bash
cd server && npx tsx request.e2e.temp.ts
```

**You should see `32 passed, 0 failed`.** That is exactly what I got. Then clean up:

```bash
rm request.e2e.temp.ts && npm run db:seed
```

## 3. On a real phone

This is the level that finds what the other two miss — everything above runs over `127.0.0.1`, which never crosses the network a phone crosses.

1. Log in as `recipient@eatme.lk` / `Test@1234`
2. Browse — urgent items must appear **first**, colours matching the expiry text
3. Search `bread` — it must match on the food name, not just the title
4. Toggle **Urgent only** and the category chips
5. Open a listing, tap **Request This Food**, step a quantity up, submit
6. **My Requests** shows it as pending
7. Withdraw it, confirm it shows as cancelled and does not disappear
8. **Take screenshots.** They go in your PR and become sprint review evidence

---

# COMMIT AND PR

Commit in chunks. **The history is graded evidence of your individual contribution** — one giant commit is worth far less than six clear ones.

```bash
git add server/src/services/request.service.ts
git commit -m "feat(request): add request service with quantity and ownership rules"
```

```bash
git add server/src/controllers/request.controller.ts server/src/routes/requests.routes.ts server/src/routes/index.ts
git commit -m "feat(request): add request endpoints with role guards and validation"
```

```bash
git add mobile/src/types/request.ts mobile/src/api/requests.api.ts
git commit -m "feat(request): add request api client and types"
```

```bash
git add mobile/src/screens/recipient/BrowseListingsScreen.tsx
git commit -m "feat(request): add browse listings screen with search and filter"
```

```bash
git add mobile/src/screens/recipient/ListingDetailScreen.tsx mobile/src/screens/recipient/CreateRequestScreen.tsx
git commit -m "feat(request): add listing detail and request form screens"
```

```bash
git add -A mobile/src/screens/recipient mobile/src/navigation
git commit -m "feat(request): add my requests screen and recipient navigation"
```

**Commit message rules, enforced by a git hook:**

- Types: `feat` `fix` `docs` `style` `refactor` `test` `chore`
- Scopes: `donation` `request` `delivery` `driver` `admin` `auth` `db` `api` `ui` `config` — **yours is `request`**
- Lower case, no full stop, whole header **under 72 characters**

Then push and open a PR **into `dev`**, never `main`:

```bash
git push -u origin feature/donation-request
```

Fill in every section of the template, attach screenshots, and ask a real teammate for the approving review — a Copilot review does not count.

---

# THE RULES BEHIND THE CODE

You will be asked about these at the viva, so read them once even though the code already implements them.

**Stock moves on acceptance, never on request creation.** A pending request must not reserve food, otherwise one recipient sitting on an unanswered request blocks everyone else from asking for the same thing. `POST /requests` writes rows and changes no quantities. The coordinator's accept handler is what decrements, using `quantityAfterAcceptance()` from `urgency.service.ts`.

**Requested items must belong to the listing.** The client sends a `listingId` and a set of `itemId`s. Without checking that every item belongs to that listing, someone could reach another donor's food by passing its id.

**Ownership errors are 404, not 403.** A 403 confirms the row exists. Returning 404 to a stranger reveals nothing.

**Expiry is re-checked at request time.** Browse already hides expired food, but time passes between browsing and submitting. Offering a charity food that spoiled while the form was open is the worst failure this system can have.

**Nothing is ever deleted.** Cancelling sets `status = 'cancelled'` and the row stays. The history is what the admin dashboard and the report are built on.

**One item cannot appear twice in one request.** The database enforces `UNIQUE (request_id, item_id)`; the zod schema catches it first so the message is readable.

---

# SEEDED TEST ACCOUNTS

Password for every account: **`Test@1234`**

| Email                  | Role        | Use for                                              |
| ---------------------- | ----------- | ---------------------------------------------------- |
| `recipient@eatme.lk`   | recipient   | your main test account                               |
| `elders@eatme.lk`      | recipient   | proving one recipient cannot see another's requests  |
| `orphanage@eatme.lk`   | recipient   | a third recipient                                    |
| `donor@eatme.lk`       | donor       | owns "Pantry stock clearance" (safe items)           |
| `hotel@eatme.lk`       | donor       | owns "Wedding function surplus" (critical + urgent)  |
| `bakery@eatme.lk`      | donor       | owns "End of day bread and buns" (partially claimed) |
| `coordinator@eatme.lk` | coordinator | will own accept/reject                               |
| `admin@eatme.lk`       | admin       |                                                      |

`npm run db:seed` wipes and recreates. Re-run it whenever your data gets confusing, and **before a demo** — the seed uses times relative to when it runs, so old data shows every item as expired.

---

## Quick reference

```bash
# every session
git checkout dev && git pull origin dev
git checkout feature/donation-request && git merge dev

# run it
wsl                              # terminal 1, leave open
npm run db:up                    # if the database is not running
npm run dev:server               # terminal 2
npm run dev:mobile               # terminal 3

# before every commit
npm run typecheck && npm run lint

# when data gets confusing
npm run db:seed

# after changing mobile/.env
npm --prefix mobile run start:clear
```

**Ask the team before installing any dependency.** The stack is fixed. Everything these screens need already exists in `components/`, `constants/theme.ts` and `utils/datetime.ts`.
