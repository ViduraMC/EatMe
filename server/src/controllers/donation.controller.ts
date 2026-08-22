import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/apiError';
import { sendSuccess } from '../utils/apiResponse';
import * as donationService from '../services/donation.service';

/**
 * Donation and Food Listing controllers. Owner: Vidura.
 *
 * These stay thin: validate, call the service, send the envelope. Business
 * rules live in services/donation.service.ts and services/urgency.service.ts.
 */

/** ISO date string in, Date out. The client sends ISO 8601 from the phone. */
const isoDate = z.coerce.date({
  errorMap: () => ({ message: 'Enter a valid date and time' }),
});

const itemSchema = z
  .object({
    foodName: z
      .string()
      .trim()
      .min(2, 'Food name must be at least 2 characters')
      .max(120),
    category: z.enum(['packaged', 'prepared']),
    quantity: z.coerce
      .number()
      .positive('Quantity must be greater than zero')
      .max(999999),
    unit: z.enum(['kg', 'servings', 'loaves', 'packets', 'cans', 'litres']),
    storageType: z.enum(['ambient', 'chilled', 'frozen']),
    expiryDate: isoDate.optional().nullable(),
    preparedAt: isoDate.optional().nullable(),
    safeWindowHours: z.coerce
      .number()
      .int()
      .positive('The safe window must be at least one hour')
      .max(720)
      .optional()
      .nullable(),
  })
  /*
   * The packaged/prepared rule is checked in three places on purpose, each
   * catching a different mistake:
   *   here      a readable field-level message on the form
   *   service   the same rule for any caller that skips this schema
   *   database  a CHECK constraint as the final backstop
   */
  .superRefine((item, ctx) => {
    if (item.category === 'packaged') {
      if (!item.expiryDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiryDate'],
          message: 'A packaged item needs an expiry date',
        });
      }
      if (item.preparedAt || item.safeWindowHours) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['preparedAt'],
          message: 'Preparation details only apply to prepared food',
        });
      }
      return;
    }

    if (!item.preparedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['preparedAt'],
        message: 'A prepared item needs the time it was cooked',
      });
    }
    if (!item.safeWindowHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['safeWindowHours'],
        message: 'A prepared item needs a safe window in hours',
      });
    }
    if (item.expiryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiryDate'],
        message: 'Prepared food derives its expiry, do not enter one',
      });
    }
  });

export const createListingSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().max(2000).optional().nullable(),
  pickupAddress: z.string().trim().min(5, 'Enter a full pickup address').max(255),
  pickupWindowStart: isoDate,
  pickupWindowEnd: isoDate,
  items: z
    .array(itemSchema)
    .min(1, 'Add at least one food item')
    .max(20, 'A listing can hold at most 20 items'),
});

export const updateListingSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    pickupAddress: z.string().trim().min(5).max(255).optional(),
    pickupWindowStart: isoDate.optional(),
    pickupWindowEnd: isoDate.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

/** Parses :id and rejects anything that is not a positive integer. */
function parseListingId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest('That listing id is not valid');
  }
  return id;
}

/** POST /api/donations */
export async function createListing(req: Request, res: Response): Promise<void> {
  const donor = req.user!;
  const input = req.body as z.infer<typeof createListingSchema>;

  const listing = await donationService.createListing(donor.userId, {
    title: input.title,
    description: input.description ?? null,
    pickupAddress: input.pickupAddress,
    pickupWindowStart: input.pickupWindowStart,
    pickupWindowEnd: input.pickupWindowEnd,
    items: input.items.map((i) => ({
      foodName: i.foodName,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      storageType: i.storageType,
      expiryDate: i.expiryDate ?? null,
      preparedAt: i.preparedAt ?? null,
      safeWindowHours: i.safeWindowHours ?? null,
    })),
  });

  sendSuccess(res, { listing: donationService.presentListing(listing) }, 201);
}

const browseQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.enum(['packaged', 'prepared']).optional(),
  urgentOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

/** GET /api/donations */
export async function browseListings(req: Request, res: Response): Promise<void> {
  const parsed = browseQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid filters', parsed.error.flatten().fieldErrors);
  }

  const result = await donationService.browseListings(parsed.data);
  sendSuccess(res, {
    ...result,
    listings: result.listings.map(donationService.presentListing),
  });
}

/** GET /api/donations/mine */
export async function listMyListings(req: Request, res: Response): Promise<void> {
  const listings = await donationService.listDonorListings(req.user!.userId);
  sendSuccess(res, { listings: listings.map(donationService.presentListing) });
}

/** GET /api/donations/:id */
export async function getListing(req: Request, res: Response): Promise<void> {
  const listing = await donationService.getListingById(parseListingId(req));
  sendSuccess(res, { listing: donationService.presentListing(listing) });
}

/** PUT /api/donations/:id */
export async function updateListing(req: Request, res: Response): Promise<void> {
  const input = req.body as z.infer<typeof updateListingSchema>;
  const listing = await donationService.updateListing(
    parseListingId(req),
    req.user!.userId,
    input,
  );
  sendSuccess(res, { listing: donationService.presentListing(listing) });
}

/** DELETE /api/donations/:id  (soft cancel) */
export async function cancelListing(req: Request, res: Response): Promise<void> {
  const listing = await donationService.cancelListing(parseListingId(req), {
    userId: req.user!.userId,
    role: req.user!.role,
  });
  sendSuccess(res, { listing: donationService.presentListing(listing) });
}

// ---------------------------------------------------------------------------
// Sprint 2: handover confirmation and read-only incoming requests
// ---------------------------------------------------------------------------

export const confirmPickupSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(500, 'Notes must be under 500 characters')
    .optional()
    .nullable(),
});

/** Parses :assignmentId and rejects anything that is not a positive integer. */
function parseAssignmentId(req: Request): number {
  const id = Number(req.params.assignmentId);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest('That delivery id is not valid');
  }
  return id;
}

/** GET /api/donations/assignments/pending-confirmation */
export async function listPendingConfirmations(
  req: Request,
  res: Response,
): Promise<void> {
  const assignments = await donationService.listAssignmentsPendingDonorConfirmation(
    req.user!.userId,
  );
  sendSuccess(res, { assignments });
}

/** PATCH /api/donations/assignments/:assignmentId/confirm-pickup */
export async function confirmPickup(req: Request, res: Response): Promise<void> {
  const input = req.body as z.infer<typeof confirmPickupSchema>;
  const assignment = await donationService.confirmPickupAsDonor(
    parseAssignmentId(req),
    req.user!.userId,
    { notes: input?.notes ?? null },
  );
  sendSuccess(res, { assignment });
}

const incomingQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']).optional(),
});

/**
 * GET /api/donations/requests/incoming
 *
 * READ ONLY. The donor sees who has asked for their food; the Donation
 * Coordinator is the one who accepts or rejects. There is deliberately no
 * write counterpart to this endpoint in the donation module.
 */
export async function listIncomingRequests(req: Request, res: Response): Promise<void> {
  const parsed = incomingQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid filter', parsed.error.flatten().fieldErrors);
  }

  const requests = await donationService.listIncomingRequests(
    req.user!.userId,
    parsed.data.status,
  );
  sendSuccess(res, { requests });
}
