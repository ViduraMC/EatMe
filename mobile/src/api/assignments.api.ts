import { api } from './client';
import type { ApiSuccess } from '../types';
import type {
  AssignmentDetail,
  AssignmentQueueRequest,
  AssignmentStatus,
  CoordinatorAssignment,
  CoordinatorStats,
  CreateAssignmentPayload,
  DriverInfo,
  RejectRequestPayload,
} from '../types/assignment';

/**
 * API calls for /api/assignments (Delivery Coordination – US-C01, US-C02, US-C03).
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

// ── US-C03 ────────────────────────────────────────────────────────────────────

/** Fetch all assignments, optionally filtered by status. */
export async function fetchAssignments(
  status?: AssignmentStatus,
): Promise<CoordinatorAssignment[]> {
  const params = status ? { status } : undefined;
  const { data } = await api.get<ApiSuccess<{ assignments: CoordinatorAssignment[] }>>(
    '/assignments',
    { params },
  );
  return data.data.assignments;
}

/** Fetch a single assignment with timeline and reassignment history. */
export async function fetchAssignmentDetail(
  assignmentId: number,
): Promise<AssignmentDetail> {
  const { data } = await api.get<ApiSuccess<{ assignment: AssignmentDetail }>>(
    `/assignments/${assignmentId}`,
  );
  return data.data.assignment;
}

/** Reassign a declined assignment to a new driver. */
export async function reassignDriver(
  assignmentId: number,
  payload: CreateAssignmentPayload,
): Promise<CoordinatorAssignment> {
  const { data } = await api.post<ApiSuccess<{ assignment: CoordinatorAssignment }>>(
    `/assignments/${assignmentId}/reassign`,
    payload,
  );
  return data.data.assignment;
}
