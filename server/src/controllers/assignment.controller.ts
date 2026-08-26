import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import * as assignmentService from '../services/assignment.service';

/**
 * Controller for Delivery Coordination and Driver Assignments.
 * Owner: Kaushal Bandara (handled by agent).
 */

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
