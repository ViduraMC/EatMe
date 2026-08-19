import type { Request, Response } from 'express';
import { getAdminStats } from '../services/admin.service';
import { sendSuccess } from '../utils/apiResponse';

/** GET /api/admin/stats */
export async function adminStats(_req: Request, res: Response): Promise<void> {
  const stats = await getAdminStats();

  sendSuccess(res, stats);
}
