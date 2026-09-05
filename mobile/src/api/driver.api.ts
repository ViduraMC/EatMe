import { api } from './client';
import type {
  ApiSuccess,
  AssignmentStatus,
  AvailabilityPayload,
  DriverAssignment,
  DriverStats,
} from '../types';

export async function setAvailabilityRequest(
  isAvailable: boolean,
): Promise<AvailabilityPayload> {
  const { data } = await api.patch<ApiSuccess<AvailabilityPayload>>(
    '/driver/availability',
    { isAvailable },
  );

  return data.data;
}

export async function fetchAssignments(
  status?: AssignmentStatus,
): Promise<DriverAssignment[]> {
  const { data } = await api.get<ApiSuccess<{ assignments: DriverAssignment[] }>>(
    '/driver/assignments',
    { params: status ? { status } : undefined },
  );

  return data.data.assignments;
}

export async function fetchAssignment(id: number): Promise<DriverAssignment> {
  const { data } = await api.get<ApiSuccess<{ assignment: DriverAssignment }>>(
    `/driver/assignments/${id}`,
  );

  return data.data.assignment;
}

//Sprint 2
export async function acceptAssignmentRequest(id: number): Promise<DriverAssignment> {
  const { data } = await api.put<ApiSuccess<{ assignment: DriverAssignment }>>(
    `/driver/assignments/${id}/accept`,
  );

  return data.data.assignment;
}

export async function declineAssignmentRequest(
  id: number,
  declineReason: string,
): Promise<DriverAssignment> {
  const { data } = await api.put<ApiSuccess<{ assignment: DriverAssignment }>>(
    `/driver/assignments/${id}/decline`,
    { declineReason },
  );

  return data.data.assignment;
}
