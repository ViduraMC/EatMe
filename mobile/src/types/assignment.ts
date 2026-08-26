import type { User } from './index';
import type { DonationItem, DonationListing } from './donation';

export interface CoordinatorStats {
  queueSize: number;
  pendingDriverCount: number;
  activeDeliveryCount: number;
  completedDeliveryCount: number;
}

export type DriverInfo = User;

export interface AssignmentQueueRequestItem {
  requestItemId: number;
  requestId: number;
  itemId: number;
  /** Decimal over the wire as a string. */
  quantityRequested: string;
  item: DonationItem;
}

export interface AssignmentQueueRequest {
  requestId: number;
  listingId: number;
  recipientId: number;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  rejectionReason: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipient: User;
  listing: DonationListing;
  items: AssignmentQueueRequestItem[];
}
