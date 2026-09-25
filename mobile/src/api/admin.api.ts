import { File, Paths } from 'expo-file-system';
import { api } from './client';
import type { ApiSuccess, UserStatus } from '../types';
import type {
  AdminAssignment,
  AdminListing,
  AdminReport,
  AdminRequest,
  AdminStats,
  AdminUser,
  ReportType,
  StaffInput,
  StaffRole,
} from '../types/admin';

/**
 * /api/admin. Owner: Naily.
 *
 * Gathered here from the individual admin screens, which each called the
 * API inline, so every admin screen shares one typed client.
 */

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<ApiSuccess<AdminStats>>('/admin/stats');
  return data.data;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<ApiSuccess<{ users: AdminUser[] }>>('/admin/users');
  return data.data.users;
}

export async function updateUserStatus(
  userId: number,
  status: UserStatus,
): Promise<AdminUser> {
  const { data } = await api.patch<ApiSuccess<{ user: AdminUser }>>(
    `/admin/users/${userId}/status`,
    { status },
  );
  return data.data.user;
}

export async function createStaff(
  input: StaffInput & { password: string; role: StaffRole },
): Promise<AdminUser> {
  const { data } = await api.post<ApiSuccess<{ user: AdminUser }>>(
    '/admin/users/staff',
    input,
  );
  return data.data.user;
}

export async function updateStaff(userId: number, input: StaffInput): Promise<AdminUser> {
  const { data } = await api.put<ApiSuccess<{ user: AdminUser }>>(
    `/admin/users/${userId}/staff`,
    input,
  );
  return data.data.user;
}

export async function deleteStaff(userId: number): Promise<void> {
  await api.delete(`/admin/users/${userId}/staff`);
}

export async function fetchAdminListings(): Promise<AdminListing[]> {
  const { data } =
    await api.get<ApiSuccess<{ listings: AdminListing[] }>>('/admin/listings');
  return data.data.listings;
}

export async function cancelAdminListing(listingId: number): Promise<AdminListing> {
  const { data } = await api.patch<ApiSuccess<{ listing: AdminListing }>>(
    `/admin/listings/${listingId}/cancel`,
  );
  return data.data.listing;
}

export async function fetchAdminRequests(): Promise<AdminRequest[]> {
  const { data } =
    await api.get<ApiSuccess<{ requests: AdminRequest[] }>>('/admin/requests');
  return data.data.requests;
}

export async function fetchAdminAssignments(): Promise<AdminAssignment[]> {
  const { data } =
    await api.get<ApiSuccess<{ assignments: AdminAssignment[] }>>('/admin/assignments');
  return data.data.assignments;
}

export async function fetchReports(): Promise<{
  active: AdminReport[];
  deleted: AdminReport[];
}> {
  const [active, deleted] = await Promise.all([
    api.get<ApiSuccess<{ reports: AdminReport[] }>>('/admin/reports'),
    api.get<ApiSuccess<{ reports: AdminReport[] }>>('/admin/reports/deleted'),
  ]);
  return { active: active.data.data.reports, deleted: deleted.data.data.reports };
}

export async function createReport(input: {
  title: string;
  type: ReportType;
  startDate: string;
  endDate: string;
}): Promise<AdminReport> {
  const { data } = await api.post<ApiSuccess<{ report: AdminReport }>>(
    '/admin/reports',
    input,
  );
  return data.data.report;
}

export async function renameReport(
  reportId: number,
  title: string,
): Promise<AdminReport> {
  const { data } = await api.put<ApiSuccess<{ report: AdminReport }>>(
    `/admin/reports/${reportId}`,
    { title },
  );
  return data.data.report;
}

export async function finalizeReport(reportId: number): Promise<AdminReport> {
  const { data } = await api.patch<ApiSuccess<{ report: AdminReport }>>(
    `/admin/reports/${reportId}/finalize`,
  );
  return data.data.report;
}

export async function deleteReport(reportId: number): Promise<void> {
  await api.delete(`/admin/reports/${reportId}`);
}

export async function restoreReport(reportId: number): Promise<AdminReport> {
  const { data } = await api.patch<ApiSuccess<{ report: AdminReport }>>(
    `/admin/reports/${reportId}/restore`,
  );
  return data.data.report;
}

export async function deleteReportPermanently(reportId: number): Promise<void> {
  await api.delete(`/admin/reports/${reportId}/permanent`);
}

/** Downloads a finalised report's PDF into the app cache and returns its file URI. */
export async function downloadReportPdf(reportId: number): Promise<string> {
  const response = await api.get<ArrayBuffer>(`/admin/reports/${reportId}/download`, {
    responseType: 'arraybuffer',
  });
  const file = new File(Paths.cache, `eatme-report-${reportId}.pdf`);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(response.data));
  return file.uri;
}
