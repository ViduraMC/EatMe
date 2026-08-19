import type { Request, Response } from 'express';
import {
  getAdminAssignments,
  getAdminListings,
  getAdminRequests,
  getAdminStats,
  getAdminUsers,
} from '../services/admin.service';
import { sendSuccess } from '../utils/apiResponse';

/** GET /api/admin/stats */
export async function adminStats(_req: Request, res: Response): Promise<void> {
  const stats = await getAdminStats();

  sendSuccess(res, stats);
}

/** GET /api/admin/users */
export async function adminUsers(_req: Request, res: Response): Promise<void> {
  const users = await getAdminUsers();

  sendSuccess(res, { users });
}

/** GET /api/admin/listings */
export async function adminListings(_req: Request, res: Response): Promise<void> {
  const listings = await getAdminListings();

  sendSuccess(res, { listings });
}

/** GET /api/admin/requests */
export async function adminRequests(_req: Request, res: Response): Promise<void> {
  const requests = await getAdminRequests();

  sendSuccess(res, { requests });
}

/** GET /api/admin/assignments */
export async function adminAssignments(_req: Request, res: Response): Promise<void> {
  const assignments = await getAdminAssignments();

  sendSuccess(res, { assignments });
}
