import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { sendSuccess } from '../utils/apiResponse';
import { driverAssignmentSelect } from '../types/driver';
import { getOwnAssignmentOrThrow } from '../services/assignment.service';

export const availabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const declineAssignmentSchema = z.object({
  declineReason: z
    .string()
    .trim()
    .min(1, 'Select or describe a reason')
    .max(500, 'Keep the reason under 500 characters'),
});

/*Statuses the mobile app can filter assignment list by */
const ASSIGNMENT_STATUSES = [
  'pending_driver',
  'accepted',
  'in_transit',
  'completed',
  'declined',
  'cancelled',
] as const;

const listQuerySchema = z.object({
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
});

function parseAssignmentId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest('Invalid assignment id');
  }

  return id;
}

// PATCH: /api/driver/availability

export async function updateAvailability(req: Request, res: Response): Promise<void> {
  const { isAvailable } = req.body as z.infer<typeof availabilitySchema>;

  const user = await prisma.user.update({
    where: { userId: req.user!.userId },
    data: { isAvailable },
    select: { userId: true, isAvailable: true },
  });

  sendSuccess(res, user);
}
