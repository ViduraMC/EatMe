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

import * as assignmentService from '../services/assignment.service';

export const confirmDropoffRecipientSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(500, 'Notes must be under 500 characters')
    .optional()
    .nullable(),
});

/** GET /api/requests/deliveries/pending-dropoff */
export async function listPendingDropoffs(req: Request, res: Response): Promise<void> {
  const assignments = await assignmentService.listPendingDropoffsForRecipient(
    req.user!.userId,
  );
  sendSuccess(res, { assignments });
}

/** PUT /api/requests/deliveries/:id/confirm-dropoff */
export async function confirmDropoff(req: Request, res: Response): Promise<void> {
  const assignmentId = Number(req.params.id);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    throw ApiError.badRequest('Invalid assignment id');
  }

  const input = req.body as z.infer<typeof confirmDropoffRecipientSchema>;

  const assignment = await assignmentService.confirmDropoffAsRecipient(
    assignmentId,
    req.user!.userId,
    { notes: input?.notes ?? null },
  );

  sendSuccess(res, { assignment });
}
