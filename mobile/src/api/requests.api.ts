import { api } from './client';
import type { ApiSuccess } from '../types';
import type {
  CreateRequestPayload,
  DonationRequest,
  RequestStatus,
} from '../types/request';

/**
 * /api/requests — Food Requests. Owner: Haritha.
 *
 * There is deliberately no accept or reject function here. Sprint 2 moved
 * approval to the Donation Coordinator, so those belong to the coordinator
 * module. Leaving them out means a recipient screen cannot casually call one.
 */

export async function createRequest(
  payload: CreateRequestPayload,
): Promise<DonationRequest> {
  const { data } = await api.post<ApiSuccess<{ request: DonationRequest }>>(
    '/requests',
    payload,
  );
  return data.data.request;
}

/** The signed-in recipient's own requests, newest first. */
export async function fetchMyRequests(
  status?: RequestStatus,
): Promise<DonationRequest[]> {
  const { data } = await api.get<ApiSuccess<{ requests: DonationRequest[] }>>(
    '/requests/mine',
    { params: status ? { status } : {} },
  );
  return data.data.requests;
}

export async function fetchRequest(requestId: number): Promise<DonationRequest> {
  const { data } = await api.get<ApiSuccess<{ request: DonationRequest }>>(
    `/requests/${requestId}`,
  );
  return data.data.request;
}

/** Withdraw a request. Only works while it is still pending. */
export async function cancelRequest(requestId: number): Promise<DonationRequest> {
  const { data } = await api.patch<ApiSuccess<{ request: DonationRequest }>>(
    `/requests/${requestId}/cancel`,
  );
  return data.data.request;
}
