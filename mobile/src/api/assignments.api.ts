import { api } from './client';
import type { ApiSuccess } from '../types';
import type {
  AssignmentQueueRequest,
  CoordinatorAssignment,
  CoordinatorStats,
  CreateAssignmentPayload,
  DriverInfo,
  RejectRequestPayload,
} from '../types/assignment';

/**
 * API calls for /api/assignments (Delivery Coordination – US-C01 & US-C02).
 */

export async function fetchAssignmentQueue(): Promise<AssignmentQueueRequest[]> {
  const { data } =
    await api.get<ApiSuccess<{ queue: AssignmentQueueRequest[] }>>('/assignments/queue');
  return data.data.queue;
}

export async function fetchCoordinatorStats(): Promise<CoordinatorStats> {
  const { data } =
    await api.get<ApiSuccess<{ stats: CoordinatorStats }>>('/assignments/stats');
  return data.data.stats;
}

export async function fetchDrivers(): Promise<DriverInfo[]> {
  const { data } =
    await api.get<ApiSuccess<{ drivers: DriverInfo[] }>>('/assignments/drivers');
  return data.data.drivers;
}

// ── US-C02 ────────────────────────────────────────────────────────────────────

export async function createAssignment(
  payload: CreateAssignmentPayload,
): Promise<CoordinatorAssignment> {
  const { data } = await api.post<ApiSuccess<{ assignment: CoordinatorAssignment }>>(
    '/assignments',
    payload,
  );
  return data.data.assignment;
}

export async function rejectRequest(
  requestId: number,
  payload: RejectRequestPayload,
): Promise<void> {
  await api.post(`/assignments/reject-request/${requestId}`, payload);
}

export async function fetchAssignments(): Promise<CoordinatorAssignment[]> {
  const { data } =
    await api.get<ApiSuccess<{ assignments: CoordinatorAssignment[] }>>('/assignments');
  return data.data.assignments;
}
