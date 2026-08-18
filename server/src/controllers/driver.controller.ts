import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { sendSuccess } from '../utils/apiResponse';
import { driverAssignmentSelect } from '../types/driver';
import {
  assertAwaitingDriverResponse,
  getOwnAssignmentOrThrow,
} from '../services/assignment.service';

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

function parseAssignmentId(raw: string | undefined): number {
  if (raw === undefined) {
    throw ApiError.badRequest('Invalid assignment id');
  }

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

// GET: /api/driver/stats
export async function getStats(req: Request, res: Response): Promise<void> {
  const driverId = req.user!.userId;
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startOfWeek = new Date(startOfToday);
  const isDayOfWeek = (startOfToday.getDay() + 6) % 7; //Monday =0
  startOfWeek.setDate(startOfToday.getDate() - isDayOfWeek);

  const [deliveriesToday, completedThisWeek] = await Promise.all([
    prisma.deliveryAssignment.count({
      where: { driverId, assignedAt: { gte: startOfToday } },
    }),
    prisma.deliveryAssignment.count({
      where: { driverId, status: 'completed', completedAt: { gte: startOfWeek } },
    }),
  ]);

  sendSuccess(res, { deliveriesToday, completedThisWeek });
}

//GET: /api/driver/assignments
export async function listAssignments(req: Request, res: Response): Promise<void> {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.badRequest(
      'Invalid status filter',
      parsed.error.flatten().fieldErrors,
    );
  }

  const assignments = await prisma.deliveryAssignment.findMany({
    where: {
      driverId: req.user!.userId,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
    select: driverAssignmentSelect,
    orderBy: { assignedAt: 'desc' },
  });
  sendSuccess(res, { assignments });
}

//GET: /api/driver/assignments/:id
export async function getAssignment(req: Request, res: Response): Promise<void> {
  const assignmentId = parseAssignmentId(req.params.id);

  const assignment = await prisma.deliveryAssignment.findFirst({
    where: { assignmentId, driverId: req.user!.userId },
    select: driverAssignmentSelect,
  });

  if (!assignment) {
    throw ApiError.notFound('Assignment not found');
  }

  sendSuccess(res, { assignment });
}

//PUT : /api/driver/assignments/:id/accept
export async function acceptAssignment(req: Request, res: Response): Promise<void> {
  const assignmentId = parseAssignmentId(req.params.id);

  const existing = await getOwnAssignmentOrThrow(assignmentId, req.user!.userId);
  assertAwaitingDriverResponse(existing);

  const assignment = await prisma.deliveryAssignment.update({
    where: { assignmentId },
    data: { status: 'accepted', respondedAt: new Date() },
    select: driverAssignmentSelect,
  });

  sendSuccess(res, { assignment });
}

//PUT: /api/driver/assignments/:id/decline
export async function declineAssignment(req: Request, res: Response): Promise<void> {
  const assignmentId = parseAssignmentId(req.params.id);
  const { declineReason } = req.body as z.infer<typeof declineAssignmentSchema>;

  const existing = await getOwnAssignmentOrThrow(assignmentId, req.user!.userId);
  assertAwaitingDriverResponse(existing);

  const [assignment] = await prisma.$transaction([
    prisma.deliveryAssignment.update({
      where: { assignmentId },
      data: { status: 'declined', declineReason, respondedAt: new Date() },
      select: driverAssignmentSelect,
    }),
    prisma.notification.create({
      data: {
        userId: existing.coordinatorId,
        type: 'driver_declined',
        title: 'Driver declined',
        body: `${req.user!.name} declined assignment #${assignmentId}. A new driver needs to be assigned.`,
        relatedEntityType: 'delivery_assignment',
        relatedEntityId: assignmentId,
      },
    }),
  ]);

  sendSuccess(res, { assignment });
}
