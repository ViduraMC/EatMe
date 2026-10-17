import type { Tone } from '../theme';
import type { AssignmentStatus, RequestStatus } from '../types/assignment';

/**
 * Status colours shared by every role, so "Accepted" is the same colour on
 * the donor's, the recipient's and the coordinator's screens. The label is
 * always written out too; colour is never the only signal.
 */
export const requestTone: Record<RequestStatus, Tone> = {
  pending: 'urgent',
  accepted: 'safe',
  rejected: 'critical',
  cancelled: 'neutral',
};

export const assignmentTone: Record<AssignmentStatus, Tone> = {
  pending_driver: 'urgent',
  accepted: 'info',
  declined: 'critical',
  in_transit: 'brand',
  completed: 'safe',
  cancelled: 'neutral',
};
