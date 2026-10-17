import type { Request, Response } from 'express';
import { z } from 'zod';

import {
  cancelAdminListing,
  createAdminReport,
  createAdminStaff,
  deleteAdminReport,
  deleteAdminStaff,
  finalizeAdminReport,
  generateAdminReportPdf,
  getAdminAssignments,
  getAdminListings,
  getAdminReport,
  getAdminReports,
  getAdminRequests,
  getAdminStats,
  getAdminUsers,
  getDeletedAdminReports,
  permanentlyDeleteAdminReport,
  restoreAdminReport,
  updateAdminReport,
  updateAdminStaff,
  updateAdminUserStatus,
} from '../services/admin.service';

import { sendSuccess } from '../utils/apiResponse';

const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(8).max(72),
  phone: z
    .string()
    .trim()
    .regex(/^07[01245678]\d{7}$/, 'Enter a valid Sri Lankan mobile number'),
  address: z.string().trim().min(5),
  role: z.enum(['coordinator', 'driver']),
});

const updateStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  phone: z
    .string()
    .trim()
    .regex(/^07[01245678]\d{7}$/, 'Enter a valid Sri Lankan mobile number'),
  address: z.string().trim().min(5),
});

const createReportSchema = z
  .object({
    title: z.string().trim().min(2).max(150),
    type: z.enum(['overall', 'users', 'donations', 'requests', 'deliveries']),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'Start date cannot be after end date',
    path: ['endDate'],
  })
  .refine(
    (data) => {
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      return data.endDate.getTime() < tomorrow.getTime();
    },
    {
      message: 'Report end date cannot be in the future',
      path: ['endDate'],
    },
  );

const updateReportSchema = z.object({
  title: z.string().trim().min(2).max(150),
});

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

/** POST /api/admin/users/staff */
export async function adminCreateStaff(req: Request, res: Response): Promise<void> {
  const input = createStaffSchema.parse(req.body);

  const user = await createAdminStaff(input);

  sendSuccess(res, { user }, 201);
}

/** PUT /api/admin/users/:userId/staff */
export async function adminUpdateStaff(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid user ID',
    });
    return;
  }

  const input = updateStaffSchema.parse(req.body);

  const user = await updateAdminStaff(userId, input);

  sendSuccess(res, { user });
}

/** DELETE /api/admin/users/:userId/staff */
export async function adminDeleteStaff(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid user ID',
    });
    return;
  }

  const deletedUser = await deleteAdminStaff(userId);

  sendSuccess(res, {
    deletedUser,
  });
}

/** PATCH /api/admin/users/:userId/status */
export async function adminUpdateUserStatus(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.userId);
  const status = req.body?.status;

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid user ID',
    });
    return;
  }

  if (
    status !== 'pending' &&
    status !== 'active' &&
    status !== 'inactive' &&
    status !== 'rejected'
  ) {
    res.status(400).json({
      success: false,
      message: 'Invalid user status',
    });
    return;
  }

  const user = await updateAdminUserStatus(userId, status);

  sendSuccess(res, { user });
}

/** GET /api/admin/listings */
export async function adminListings(_req: Request, res: Response): Promise<void> {
  const listings = await getAdminListings();

  sendSuccess(res, { listings });
}

/** PATCH /api/admin/listings/:listingId/cancel */
export async function adminCancelListing(req: Request, res: Response): Promise<void> {
  const listingId = Number(req.params.listingId);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid donation listing ID',
    });
    return;
  }

  const listing = await cancelAdminListing(listingId);

  sendSuccess(res, { listing });
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

/** POST /api/admin/reports */
export async function adminCreateReport(req: Request, res: Response): Promise<void> {
  const input = createReportSchema.parse(req.body);

  const report = await createAdminReport({
    adminId: req.user!.userId,
    ...input,
  });

  sendSuccess(res, { report }, 201);
}

/** GET /api/admin/reports */
export async function adminReports(req: Request, res: Response): Promise<void> {
  const reports = await getAdminReports(req.user!.userId);

  sendSuccess(res, { reports });
}

/** GET /api/admin/reports/:reportId */
export async function adminReport(req: Request, res: Response): Promise<void> {
  const reportId = Number(req.params.reportId);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid report ID',
    });
    return;
  }

  const report = await getAdminReport(req.user!.userId, reportId);

  sendSuccess(res, { report });
}

/** PUT /api/admin/reports/:reportId */
export async function adminUpdateReport(req: Request, res: Response): Promise<void> {
  const reportId = Number(req.params.reportId);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid report ID',
    });
    return;
  }

  const input = updateReportSchema.parse(req.body);

  const report = await updateAdminReport(req.user!.userId, reportId, input);

  sendSuccess(res, { report });
}

/** DELETE /api/admin/reports/:reportId */
export async function adminDeleteReport(req: Request, res: Response): Promise<void> {
  const reportId = Number(req.params.reportId);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid report ID',
    });
    return;
  }

  const deletedReport = await deleteAdminReport(req.user!.userId, reportId);

  sendSuccess(res, { deletedReport });
}

/** GET /api/admin/reports/deleted */
export async function adminDeletedReports(req: Request, res: Response): Promise<void> {
  const reports = await getDeletedAdminReports(req.user!.userId);

  sendSuccess(res, { reports });
}

/** PATCH /api/admin/reports/:reportId/finalize */
export async function adminFinalizeReport(req: Request, res: Response): Promise<void> {
  const reportId = Number(req.params.reportId);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid report ID',
    });
    return;
  }

  const report = await finalizeAdminReport(req.user!.userId, reportId);

  sendSuccess(res, { report });
}

/** PATCH /api/admin/reports/:reportId/restore */
export async function adminRestoreReport(req: Request, res: Response): Promise<void> {
  const reportId = Number(req.params.reportId);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid report ID',
    });
    return;
  }

  const report = await restoreAdminReport(req.user!.userId, reportId);

  sendSuccess(res, { report });
}

/** DELETE /api/admin/reports/:reportId/permanent */
export async function adminPermanentlyDeleteReport(
  req: Request,
  res: Response,
): Promise<void> {
  const reportId = Number(req.params.reportId);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid report ID',
    });
    return;
  }

  const deletedReport = await permanentlyDeleteAdminReport(req.user!.userId, reportId);

  sendSuccess(res, { deletedReport });
}

/** GET /api/admin/reports/:reportId/download */
export async function adminDownloadReport(req: Request, res: Response): Promise<void> {
  const reportId = Number(req.params.reportId);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid report ID',
    });
    return;
  }

  const pdf = await generateAdminReportPdf(req.user!.userId, reportId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="eatme-report-${reportId}.pdf"`,
  );
  res.setHeader('Content-Length', pdf.length.toString());

  res.status(200).send(pdf);
}
