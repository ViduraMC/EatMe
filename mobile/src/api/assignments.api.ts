import { api } from './client';
import type { ApiSuccess } from '../types';
import type {
  AssignmentQueueRequest,
  CoordinatorStats,
  DriverInfo,
} from '../types/assignment';

/**
 * API calls for /api/assignments (Delivery Coordination).
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
