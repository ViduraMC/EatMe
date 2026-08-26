/**
 * Delivery assignment and incoming request types.
 * Combines donor side types and coordinator side types.
 */

import type { User } from './index';
import type {
  DonationItem,
  DonationListing,
  ItemCategory,
  ItemUnit,
  ListingStatus,
} from './donation';

export type AssignmentStatus =
  'pending_driver' | 'accepted' | 'declined' | 'in_transit' | 'completed' | 'cancelled';

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

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
  status: RequestStatus;
  rejectionReason: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipient: User;
  listing: DonationListing;
  items: AssignmentQueueRequestItem[];
}

export interface RequestedItem {
  requestItemId: number;
  requestId: number;
  itemId: number;
  /** Decimal over the wire. */
  quantityRequested: string;
  item: {
    itemId: number;
    foodName: string;
    unit: ItemUnit;
    category: ItemCategory;
  };
}

export interface RequesterSummary {
  userId: number;
  name: string;
  organisationName: string | null;
  phone: string;
}

/** A request made against one of the donor's listings. Read only for a donor. */
export interface IncomingRequest {
  requestId: number;
  listingId: number;
  recipientId: number;
  message: string | null;
  status: RequestStatus;
  rejectionReason: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  listing: {
    listingId: number;
    title: string;
    status: ListingStatus;
  };
  recipient: RequesterSummary;
  items: RequestedItem[];
}

export interface AssignmentDriver {
  userId: number;
  name: string;
  phone: string;
}

/** An assignment as the donor sees it. */
export interface DonorAssignment {
  assignmentId: number;
  requestId: number;
  coordinatorId: number;
  driverId: number;
  status: AssignmentStatus;
  noteToDriver: string | null;
  declineReason: string | null;
  assignedAt: string;
  respondedAt: string | null;
  /** Set by this donor confirming handover. Null until then. */
  pickupDonorConfirmedAt: string | null;
  /** Set by the driver. The donor can read it but never writes it. */
  pickupDriverConfirmedAt: string | null;
  pickupNotes: string | null;
  dropoffDriverConfirmedAt: string | null;
  dropoffRecipientConfirmedAt: string | null;
  dropoffNotes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  driver: AssignmentDriver;
  request: {
    requestId: number;
    status: RequestStatus;
    message: string | null;
    listing: {
      listingId: number;
      donorId: number;
      title: string;
      pickupAddress: string;
      pickupWindowStart: string;
      pickupWindowEnd: string;
    };
    recipient: RequesterSummary;
    items: RequestedItem[];
  };
}

export interface ConfirmPickupPayload {
  notes?: string | null;
}
