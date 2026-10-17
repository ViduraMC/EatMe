export type AssignmentStatus =
  'pending_driver' | 'accepted' | 'declined' | 'in_transit' | 'completed' | 'cancelled';

export type ItemUnit = 'kg' | 'servings' | 'loaves' | 'packets' | 'cans' | 'litres';
export type StorageType = 'ambient' | 'chilled' | 'frozen';

export interface AssignmentItem {
  quantityRequested: number;
  item: {
    foodName: string;
    unit: ItemUnit;
    storageType: StorageType;
  };
}

export interface DriverAssignment {
  assignmentId: number;
  status: AssignmentStatus;
  noteToDriver: string | null;
  declineReason: string | null;
  assignedAt: string;
  respondedAt: string | null;
  pickupDonorConfirmedAt: string | null;
  pickupDriverConfirmedAt: string | null;
  pickupNotes: string | null;
  dropoffDriverConfirmedAt: string | null;
  dropoffRecipientConfirmedAt: string | null;
  dropoffNotes: string | null;
  completedAt: string | null;
  coordinator: { userId: number; name: string; phone: string };
  request: {
    requestId: number;
    status: string;
    listing: {
      listingId: number;
      title: string;
      pickupAddress: string;
      pickupWindowStart: string;
      pickupWindowEnd: string;
      donor: { name: string; phone: string };
    };
    recipient: { name: string; phone: string; address: string };
    items: AssignmentItem[];
  };
}

export interface DriverStats {
  deliveriesToday: number;
  completedThisWeek: number;
}

export interface AvailabilityPayload {
  userId: number;
  isAvailable: boolean;
}
