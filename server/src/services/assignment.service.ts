import type { AssignmentStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { quantityAfterAcceptance } from './urgency.service';
import { evaluateUrgency } from './urgency.service';
import { driverAssignmentSelect, type DriverAssignment } from '../types/driver';

/**
 * Delivery-assignment rules shared across modules.
 *
 * Both the driver module (accept/decline) and the coordinator module
 * (create/reassign, Kaushal) mutate DeliveryAssignment.status, and the "decline
 * creates a new row rather than overwriting" rule needs to hold no matter which
 * side is looking at it. The guards live here so the two cannot drift apart,
 * the same reasoning as urgency.service.ts.
 */

const OWNED_ASSIGNMENT_SELECT = {
  assignmentId: true,
  driverId: true,
  coordinatorId: true,
  status: true,
  pickupDonorConfirmedAt: true,
  pickupDriverConfirmedAt: true,
  dropoffDriverConfirmedAt: true,
} satisfies Record<string, true>;

type OwnedAssignment = {
  assignmentId: number;
  driverId: number;
  coordinatorId: number;
  status: AssignmentStatus;
  pickupDonorConfirmedAt: Date | null;
  pickupDriverConfirmedAt: Date | null;
  dropoffDriverConfirmedAt: Date | null;
};

/**
 * Loads an assignment and confirms it belongs to this driver.
 *
 * "Not yours" and "does not exist" both surface as 404, the same reasoning as
 * login's generic failure message: a driver probing assignment ids should not
 * be able to tell the difference between the two.
 */
export async function getOwnAssignmentOrThrow(
  assignmentId: number,
  driverId: number,
): Promise<OwnedAssignment> {
  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { assignmentId },
    select: OWNED_ASSIGNMENT_SELECT,
  });

  if (!assignment || assignment.driverId !== driverId) {
    throw ApiError.notFound('Assignment not found');
  }

  return assignment;
}

/** Accept and decline are both only valid while the driver has not yet responded. */
export function assertAwaitingDriverResponse(
  assignment: Pick<OwnedAssignment, 'status'>,
): void {
  if (assignment.status !== 'pending_driver') {
    throw ApiError.conflict(
      `This assignment is already ${assignment.status.replace(/_/g, ' ')} and can no longer be accepted or declined`,
    );
  }
}

/**
 * Decides what status an assignment should hold after a pickup confirmation.
 *
 * THE RULE, in one place: an assignment becomes in_transit only when BOTH
 * sides have confirmed the pickup (US-D03 donor side, US-DR03 driver side).
 * One side alone does not demonstrate the food changed hands, and a handover
 * is only trustworthy if both parties say it happened.
 *
 * Lives here, not in donation.service.ts, so the donor and driver
 * confirmation flows both call the same rule instead of each keeping their
 * own copy of it.
 */
export function statusAfterPickupConfirmation(assignment: {
  status: AssignmentStatus;
  pickupDonorConfirmedAt: Date | null;
  pickupDriverConfirmedAt: Date | null;
}): AssignmentStatus {
  // Terminal states are never recomputed from timestamps.
  if (
    assignment.status === 'completed' ||
    assignment.status === 'declined' ||
    assignment.status === 'cancelled'
  ) {
    return assignment.status;
  }

  const bothConfirmed =
    assignment.pickupDonorConfirmedAt !== null &&
    assignment.pickupDriverConfirmedAt !== null;

  return bothConfirmed ? 'in_transit' : assignment.status;
}

export interface ConfirmPickupInput {
  /** Optional free text written to pickup_notes. */
  notes?: string | null;
}

/**
 * US-DR03: The driver confirms the food has been handed over at pickup.
 *
 * Writes pickup_driver_confirmed_at and, when the donor has already
 * confirmed (US-D03, donation.service.ts confirmPickupAsDonor), moves the
 * assignment to in_transit via statusAfterPickupConfirmation. Until both
 * sides have confirmed, the assignment stays accepted.
 *
 * The timestamp and the status change go in one update for the same reason
 * as the donor side: a timestamp written without the matching status change
 * would leave a delivery both parties confirmed that never left "accepted".
 */
export async function confirmPickupAsDriver(
  assignmentId: number,
  driverId: number,
  input: ConfirmPickupInput = {},
): Promise<DriverAssignment> {
  const existing = await getOwnAssignmentOrThrow(assignmentId, driverId);

  // Reject rather than silently overwriting. The first timestamp records when
  // the handover actually happened; overwriting it destroys that evidence.
  if (existing.pickupDriverConfirmedAt) {
    throw ApiError.badRequest(
      'You have already confirmed this pickup. It cannot be confirmed twice.',
    );
  }

  if (existing.status === 'declined' || existing.status === 'cancelled') {
    throw ApiError.badRequest(
      'This delivery is no longer active, so there is nothing to confirm',
    );
  }
  if (existing.status === 'completed') {
    throw ApiError.badRequest('This delivery is already complete');
  }
  if (existing.status === 'pending_driver') {
    throw ApiError.badRequest('Accept this assignment before confirming pickup');
  }

  const confirmedAt = new Date();
  const nextStatus = statusAfterPickupConfirmation({
    status: existing.status,
    pickupDonorConfirmedAt: existing.pickupDonorConfirmedAt,
    pickupDriverConfirmedAt: confirmedAt,
  });

  return prisma.deliveryAssignment.update({
    where: { assignmentId },
    data: {
      pickupDriverConfirmedAt: confirmedAt,
      status: nextStatus,
      ...(input.notes ? { pickupNotes: input.notes } : {}),
    },
    select: driverAssignmentSelect,
  });
}

export interface ConfirmDropoffInput {
  /** Optional free text written to dropoff_notes. */
  notes?: string | null;
}

/**
 * US-DR03: The driver confirms the food has been handed to the recipient.
 *
 * Only valid once the assignment is in_transit, i.e. both driver and donor
 * have already confirmed pickup — an assignment still sitting in accepted
 * means pickup was never fully confirmed, so there is nothing to drop off
 * yet.
 *
 * Writes dropoff_driver_confirmed_at and completed_at together and moves the
 * assignment straight to completed. dropoff_recipient_confirmed_at stays
 * reserved on the schema for a future recipient-side confirmation ticket;
 * this one only covers the driver's side of drop off.
 */
export async function confirmDropoffAsDriver(
  assignmentId: number,
  driverId: number,
  input: ConfirmDropoffInput = {},
): Promise<DriverAssignment> {
  const existing = await getOwnAssignmentOrThrow(assignmentId, driverId);

  if (existing.dropoffDriverConfirmedAt) {
    throw ApiError.badRequest(
      'You have already confirmed this drop off. It cannot be confirmed twice.',
    );
  }

  if (existing.status === 'declined' || existing.status === 'cancelled') {
    throw ApiError.badRequest(
      'This delivery is no longer active, so there is nothing to confirm',
    );
  }
  if (existing.status === 'completed') {
    throw ApiError.badRequest('This delivery is already complete');
  }
  if (existing.status !== 'in_transit') {
    throw ApiError.badRequest(
      'Pickup must be confirmed by both the driver and the donor before drop off can be confirmed',
    );
  }

  const confirmedAt = new Date();

  return prisma.deliveryAssignment.update({
    where: { assignmentId },
    data: {
      dropoffDriverConfirmedAt: confirmedAt,
      completedAt: confirmedAt,
      status: 'completed',
      ...(input.notes ? { dropoffNotes: input.notes } : {}),
    },
    select: driverAssignmentSelect,
  });
}

/**
 * Service logic for delivery coordination and driver assignments (US-C01 & US-C02).
 * Owner: Kaushal Bandara (handled by agent).
 */

function presentRequest(request: any) {
  return {
    ...request,
    items: request.items.map((ri: any) => {
      try {
        const { level, effectiveExpiry } = evaluateUrgency({
          category: ri.item.category,
          expiryDate: ri.item.expiryDate,
          preparedAt: ri.item.preparedAt,
          safeWindowHours: ri.item.safeWindowHours,
        });
        return {
          ...ri,
          item: {
            ...ri.item,
            urgencyLevel: level,
            effectiveExpiry,
          },
        };
      } catch {
        return {
          ...ri,
          item: {
            ...ri.item,
            urgencyLevel: 'critical',
            effectiveExpiry: ri.item.computedExpiry ?? ri.item.expiryDate ?? null,
          },
        };
      }
    }),
  };
}

/**
 * Get the queue of requests that need assignment (pending or accepted requests with no active assignments).
 */
export async function getAssignmentQueue() {
  const requests = await prisma.donationRequest.findMany({
    where: {
      status: {
        in: ['pending', 'accepted'],
      },
      assignments: {
        none: {
          status: {
            in: ['pending_driver', 'accepted', 'in_transit', 'completed'],
          },
        },
      },
    },
    include: {
      recipient: {
        select: {
          userId: true,
          name: true,
          organisationName: true,
          phone: true,
          address: true,
        },
      },
      listing: {
        include: {
          donor: {
            select: {
              userId: true,
              name: true,
              organisationName: true,
              phone: true,
              address: true,
            },
          },
        },
      },
      items: {
        include: {
          item: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return requests.map(presentRequest);
}

/**
 * Get KPI counts for the coordinator dashboard.
 */
export async function getCoordinatorStats() {
  const queueSize = await prisma.donationRequest.count({
    where: {
      status: {
        in: ['pending', 'accepted'],
      },
      assignments: {
        none: {
          status: {
            in: ['pending_driver', 'accepted', 'in_transit', 'completed'],
          },
        },
      },
    },
  });

  const pendingDriverCount = await prisma.deliveryAssignment.count({
    where: {
      status: 'pending_driver',
    },
  });

  const activeDeliveryCount = await prisma.deliveryAssignment.count({
    where: {
      status: {
        in: ['accepted', 'in_transit'],
      },
    },
  });

  const completedDeliveryCount = await prisma.deliveryAssignment.count({
    where: {
      status: 'completed',
    },
  });

  return {
    queueSize,
    pendingDriverCount,
    activeDeliveryCount,
    completedDeliveryCount,
  };
}

/**
 * List all active drivers along with availability.
 */
export async function getDriversList() {
  return prisma.user.findMany({
    where: {
      role: 'driver',
      status: 'active',
    },
    select: {
      userId: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      isAvailable: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

export interface CreateAssignmentInput {
  requestId: number;
  driverId: number;
  noteToDriver?: string | null;
}

/**
 * US-C02: Create delivery assignment and accept request in a single atomic transaction.
 */
export async function createAssignment(
  coordinatorId: number,
  input: CreateAssignmentInput,
) {
  const { requestId, driverId, noteToDriver } = input;

  return prisma.$transaction(async (tx) => {
    // 1. Fetch request with items & listing
    const request = await tx.donationRequest.findUnique({
      where: { requestId },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        listing: {
          include: {
            items: true,
          },
        },
        assignments: true,
      },
    });

    if (!request) {
      throw ApiError.notFound('That request does not exist');
    }

    if (request.status === 'rejected' || request.status === 'cancelled') {
      throw ApiError.badRequest(`Cannot assign driver to a ${request.status} request`);
    }

    // Check if an active assignment already exists
    const hasActiveAssignment = request.assignments.some((a) =>
      ['pending_driver', 'accepted', 'in_transit', 'completed'].includes(a.status),
    );
    if (hasActiveAssignment) {
      throw ApiError.badRequest(
        'An active delivery assignment already exists for this request',
      );
    }

    // 2. Validate driver
    const driver = await tx.user.findUnique({
      where: { userId: driverId },
    });

    if (!driver || driver.role !== 'driver' || driver.status !== 'active') {
      throw ApiError.badRequest('Select a valid active driver');
    }

    // 3. If request is still pending, decrement quantityRemaining on items
    if (request.status === 'pending') {
      for (const reqItem of request.items) {
        const currentRemaining = Number(reqItem.item.quantityRemaining);
        const requestedQty = Number(reqItem.quantityRequested);

        if (requestedQty > currentRemaining) {
          throw ApiError.badRequest(
            `Requested quantity for ${reqItem.item.foodName} (${requestedQty}) exceeds remaining stock (${currentRemaining})`,
          );
        }

        const newRemaining = quantityAfterAcceptance(currentRemaining, requestedQty);

        await tx.donationItem.update({
          where: { itemId: reqItem.itemId },
          data: {
            quantityRemaining: newRemaining,
          },
        });
      }

      // Compute new listing status: if all items are fully reserved, close to 'partially_fulfilled' or 'fulfilled'.
      const updatedItems = await tx.donationItem.findMany({
        where: { listingId: request.listingId },
        select: { quantity: true, quantityRemaining: true },
      });

      const allClaimed = updatedItems.every((i) => Number(i.quantityRemaining) === 0);
      const anyClaimed = updatedItems.some(
        (i) => Number(i.quantityRemaining) < Number(i.quantity),
      );

      const currentStatus = request.listing.status;
      let newListingStatus = currentStatus;
      if (allClaimed) {
        newListingStatus = 'fully_claimed';
      } else if (anyClaimed && currentStatus === 'open') {
        newListingStatus = 'partially_claimed';
      }

      if (newListingStatus !== currentStatus) {
        await tx.donationListing.update({
          where: { listingId: request.listingId },
          data: { status: newListingStatus },
        });
      }

      // Mark request as accepted
      await tx.donationRequest.update({
        where: { requestId },
        data: {
          status: 'accepted',
          respondedAt: new Date(),
        },
      });
    }

    // 4. Create the delivery assignment
    const assignment = await tx.deliveryAssignment.create({
      data: {
        requestId,
        coordinatorId,
        driverId,
        noteToDriver: noteToDriver ?? null,
        status: 'pending_driver',
      },
      include: {
        driver: {
          select: {
            userId: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        coordinator: {
          select: {
            userId: true,
            name: true,
          },
        },
        request: {
          include: {
            recipient: {
              select: {
                userId: true,
                name: true,
                organisationName: true,
                phone: true,
                address: true,
              },
            },
            listing: {
              include: {
                donor: {
                  select: {
                    userId: true,
                    name: true,
                    organisationName: true,
                    phone: true,
                    address: true,
                  },
                },
              },
            },
            items: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    return assignment;
  });
}

/**
 * US-C02: Reject a pending request with a reason.
 */
export async function rejectRequest(
  coordinatorId: number,
  requestId: number,
  rejectionReason?: string | null,
) {
  const request = await prisma.donationRequest.findUnique({
    where: { requestId },
  });

  if (!request) {
    throw ApiError.notFound('That request does not exist');
  }

  if (request.status !== 'pending') {
    throw ApiError.badRequest(
      `Cannot reject a request that is already ${request.status}`,
    );
  }

  return prisma.donationRequest.update({
    where: { requestId },
    data: {
      status: 'rejected',
      rejectionReason: rejectionReason ?? null,
      respondedAt: new Date(),
    },
    include: {
      recipient: {
        select: {
          userId: true,
          name: true,
          organisationName: true,
        },
      },
      listing: {
        select: {
          listingId: true,
          title: true,
        },
      },
    },
  });
}

/**
 * US-C03: Get all delivery assignments with optional status filter and
 * attention-first ordering (pending_driver and declined float to top).
 */
export async function getAllAssignments(statusFilter?: AssignmentStatus) {
  const assignments = await prisma.deliveryAssignment.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      driver: {
        select: {
          userId: true,
          name: true,
          phone: true,
          isAvailable: true,
        },
      },
      coordinator: {
        select: {
          userId: true,
          name: true,
        },
      },
      request: {
        include: {
          recipient: {
            select: {
              userId: true,
              name: true,
              organisationName: true,
              phone: true,
              address: true,
            },
          },
          listing: {
            include: {
              donor: {
                select: {
                  userId: true,
                  name: true,
                  organisationName: true,
                  phone: true,
                  address: true,
                },
              },
            },
          },
          items: {
            include: {
              item: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Attention-first sort: statuses that need coordinator action float to top.
  const priorityOrder: Record<AssignmentStatus, number> = {
    pending_driver: 0,
    declined: 1,
    in_transit: 2,
    accepted: 3,
    cancelled: 4,
    completed: 5,
  };

  return assignments.sort(
    (a, b) => (priorityOrder[a.status] ?? 99) - (priorityOrder[b.status] ?? 99),
  );
}

// ---------------------------------------------------------------------------
// US-C03: Assignment detail with status timeline
// ---------------------------------------------------------------------------

interface TimelineEvent {
  event: string;
  timestamp: string;
}

/**
 * Builds a chronological timeline from the nullable timestamp columns on a
 * delivery assignment. No extra table needed — the columns already capture
 * every meaningful state change.
 */
function buildTimeline(assignment: {
  status: AssignmentStatus;
  assignedAt: Date;
  respondedAt: Date | null;
  pickupDonorConfirmedAt: Date | null;
  pickupDriverConfirmedAt: Date | null;
  dropoffDriverConfirmedAt: Date | null;
  dropoffRecipientConfirmedAt: Date | null;
  completedAt: Date | null;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    event: 'Driver assigned',
    timestamp: assignment.assignedAt.toISOString(),
  });

  if (assignment.respondedAt) {
    const label =
      assignment.status === 'declined' ? 'Driver declined' : 'Driver accepted';
    events.push({ event: label, timestamp: assignment.respondedAt.toISOString() });
  }

  if (assignment.pickupDonorConfirmedAt) {
    events.push({
      event: 'Donor confirmed pickup',
      timestamp: assignment.pickupDonorConfirmedAt.toISOString(),
    });
  }

  if (assignment.pickupDriverConfirmedAt) {
    events.push({
      event: 'Driver confirmed pickup',
      timestamp: assignment.pickupDriverConfirmedAt.toISOString(),
    });
  }

  if (assignment.dropoffDriverConfirmedAt) {
    events.push({
      event: 'Driver confirmed drop-off',
      timestamp: assignment.dropoffDriverConfirmedAt.toISOString(),
    });
  }

  if (assignment.dropoffRecipientConfirmedAt) {
    events.push({
      event: 'Recipient confirmed delivery',
      timestamp: assignment.dropoffRecipientConfirmedAt.toISOString(),
    });
  }

  if (assignment.completedAt) {
    events.push({
      event: 'Delivery completed',
      timestamp: assignment.completedAt.toISOString(),
    });
  }

  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

/**
 * US-C03: Fetch a single assignment with full detail, a status timeline, and
 * the history of every assignment made against the same request (so the
 * coordinator can see previous declines).
 */
export async function getAssignmentById(assignmentId: number) {
  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { assignmentId },
    include: {
      driver: {
        select: {
          userId: true,
          name: true,
          phone: true,
          isAvailable: true,
        },
      },
      coordinator: {
        select: {
          userId: true,
          name: true,
        },
      },
      request: {
        include: {
          recipient: {
            select: {
              userId: true,
              name: true,
              organisationName: true,
              phone: true,
              address: true,
            },
          },
          listing: {
            include: {
              donor: {
                select: {
                  userId: true,
                  name: true,
                  organisationName: true,
                  phone: true,
                  address: true,
                },
              },
            },
          },
          items: {
            include: {
              item: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    throw ApiError.notFound('Assignment not found');
  }

  const timeline = buildTimeline(assignment);

  // Every assignment for the same request, so the coordinator sees the
  // full reassignment history.
  const relatedAssignments = await prisma.deliveryAssignment.findMany({
    where: { requestId: assignment.requestId },
    select: {
      assignmentId: true,
      status: true,
      driverId: true,
      assignedAt: true,
      respondedAt: true,
      declineReason: true,
      driver: { select: { name: true } },
    },
    orderBy: { assignedAt: 'asc' },
  });

  return { ...assignment, timeline, relatedAssignments };
}

/**
 * US-C03: Reassign a declined assignment to a new driver. Creates a new
 * assignment row so the declined one stays in the history — agreed at Sprint 0
 * ERD sign-off.
 */
export async function reassignDriver(
  coordinatorId: number,
  declinedAssignmentId: number,
  input: CreateAssignmentInput,
) {
  const old = await prisma.deliveryAssignment.findUnique({
    where: { assignmentId: declinedAssignmentId },
  });

  if (!old) {
    throw ApiError.notFound('Assignment not found');
  }

  if (old.status !== 'declined') {
    throw ApiError.badRequest(
      'Only a declined assignment can be reassigned. This one is ' +
        old.status.replace(/_/g, ' '),
    );
  }

  // Reuse the existing createAssignment transaction — it inserts a fresh row
  // for the same request and validates the driver.
  return createAssignment(coordinatorId, {
    requestId: old.requestId,
    driverId: input.driverId,
    noteToDriver: input.noteToDriver ?? null,
  });
}
