import type { AssignmentStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';

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
} satisfies Record<string, true>;

type OwnedAssignment = {
  assignmentId: number;
  driverId: number;
  coordinatorId: number;
  status: AssignmentStatus;
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
