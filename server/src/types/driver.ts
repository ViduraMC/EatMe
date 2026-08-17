import { Prisma } from '@prisma/client';

/**
 * The shape of a delivery assignment as returned to the driver who owns it.
 * Used by both the list and the detail endpoint, same reasoning as
 * publicUserSelect: one place to check rather than one per route.
 *
 * Pickup details come from the listing and its donor. Drop-off details come
 * from the recipient on the request. There is no dedicated "drop-off window"
 * column in the schema yet (docs/03-database-design.md), so the drop-off side
 * has a contact and address but no time window until that is added.
 */
export const driverAssignmentSelect = {
  assignmentId: true,
  status: true,
  noteToDriver: true,
  declineReason: true,
  assignedAt: true,
  respondedAt: true,
  pickupDonorConfirmedAt: true,
  pickupDriverConfirmedAt: true,
  pickupNotes: true,
  dropoffDriverConfirmedAt: true,
  dropoffRecipientConfirmedAt: true,
  dropoffNotes: true,
  completedAt: true,
  coordinator: {
    select: { userId: true, name: true, phone: true },
  },
  request: {
    select: {
      requestId: true,
      status: true,
      listing: {
        select: {
          listingId: true,
          title: true,
          pickupAddress: true,
          pickupWindowStart: true,
          pickupWindowEnd: true,
          donor: { select: { name: true, phone: true } },
        },
      },
      recipient: {
        select: { name: true, phone: true, address: true },
      },
      items: {
        select: {
          quantityRequested: true,
          item: {
            select: { foodName: true, unit: true, storageType: true },
          },
        },
      },
    },
  },
} satisfies Prisma.DeliveryAssignmentSelect;

export type DriverAssignment = Prisma.DeliveryAssignmentGetPayload<{
  select: typeof driverAssignmentSelect;
}>;
