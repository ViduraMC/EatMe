import type { UserRole, UserStatus } from './index';
import type { ListingStatus } from './donation';
import type { AssignmentStatus, RequestStatus } from './assignment';

/**
 * Shapes returned by /api/admin. They were previously declared separately
 * inside each admin screen; one definition keeps them in step with the API.
 */

export interface AdminStats {
  users: { total: number; active: number };
  listings: { total: number; open: number };
  requests: { total: number; pending: number };
  assignments: { total: number; completed: number };
}

export interface AdminUser {
  userId: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  organisationName: string | null;
  isAvailable: boolean;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  _count: {
    listings: number;
    requests: number;
    coordinatedAssignments: number;
    drivenAssignments: number;
  };
}

export type StaffRole = 'coordinator' | 'driver';

export interface StaffInput {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface AdminParty {
  userId: number;
  name: string;
  organisationName: string | null;
}

export interface AdminListing {
  listingId: number;
  donorId: number;
  title: string;
  description: string | null;
  pickupAddress: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  donor: AdminParty & { email: string; phone: string; status: UserStatus };
  _count: { requests: number };
}

export interface AdminRequest {
  requestId: number;
  listingId: number;
  recipientId: number;
  message: string | null;
  status: RequestStatus;
  rejectionReason: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipient: AdminParty & { email: string; phone: string; status: UserStatus };
  listing: {
    listingId: number;
    title: string;
    status: string;
    pickupAddress: string;
    donor: AdminParty;
  };
  items: {
    requestItemId: number;
    quantityRequested: string;
    item: { itemId: number; foodName: string; unit: string };
  }[];
  _count: { assignments: number };
}

export interface AdminAssignment {
  assignmentId: number;
  requestId: number;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
  coordinator: { userId: number; name: string; email: string; phone: string };
  driver: {
    userId: number;
    name: string;
    email: string;
    phone: string;
    isAvailable: boolean;
    status: UserStatus;
  };
  request: {
    requestId: number;
    status: string;
    recipient: AdminParty;
    listing: {
      listingId: number;
      title: string;
      pickupAddress: string;
      donor: AdminParty;
    };
  };
}

export type ReportType = 'overall' | 'users' | 'donations' | 'requests' | 'deliveries';
export type ReportStatus = 'draft' | 'finalized';

export interface AdminReport {
  reportId: number;
  adminId: number;
  title: string;
  type: ReportType;
  status: ReportStatus;
  startDate: string;
  endDate: string;
  /** Counts grouped by section; see generateReportData on the server. */
  data: Record<string, unknown>;
  finalizedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
