import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/apiError';
import { sendSuccess } from '../utils/apiResponse';
import * as assignmentService from '../services/assignment.service';

/**
 * Controller for Delivery Coordination and Driver Assignments (US-C01 & US-C02).
 * Owner: Kaushal Bandara (handled by agent).
 */

export const createAssignmentSchema = z.object({
  requestId: z.coerce.number().int().positive('Valid requestId is required'),
  driverId: z.coerce.number().int().positive('Select a driver'),
  noteToDriver: z.string().trim().max(1000).optional().nullable(),
});

export const rejectRequestSchema = z.object({
  rejectionReason: z.string().trim().max(1000).optional().nullable(),
});

/** GET /api/assignments/queue */
export async function getQueue(req: Request, res: Response): Promise<void> {
  const queue = await assignmentService.getAssignmentQueue();
  sendSuccess(res, { queue });
}

/** GET /api/assignments/stats */
export async function getStats(req: Request, res: Response): Promise<void> {
  const stats = await assignmentService.getCoordinatorStats();
  sendSuccess(res, { stats });
}

/** GET /api/assignments/drivers */
export async function getDrivers(req: Request, res: Response): Promise<void> {
  const drivers = await assignmentService.getDriversList();
  sendSuccess(res, { drivers });
}

/** POST /api/assignments */
export async function createAssignment(req: Request, res: Response): Promise<void> {
  const coordinator = req.user!;
  const input = req.body as z.infer<typeof createAssignmentSchema>;

  const assignment = await assignmentService.createAssignment(coordinator.userId, {
    requestId: input.requestId,
    driverId: input.driverId,
    noteToDriver: input.noteToDriver ?? null,
  });

  sendSuccess(res, { assignment }, 201);
}

/** POST /api/assignments/reject-request/:id */
export async function rejectRequest(req: Request, res: Response): Promise<void> {
  const coordinator = req.user!;
  const requestId = Number(req.params.id);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw ApiError.badRequest('That request id is not valid');
  }

  const input = req.body as z.infer<typeof rejectRequestSchema>;

  const request = await assignmentService.rejectRequest(
    coordinator.userId,
    requestId,
    input.rejectionReason ?? null,
  );

  sendSuccess(res, { request });
}

/** GET /api/assignments */
export async function getAllAssignments(req: Request, res: Response): Promise<void> {
  const assignments = await assignmentService.getAllAssignments();
  sendSuccess(res, { assignments });
}
