import { prisma } from '../config/prisma';
import { evaluateUrgency } from './urgency.service';

/**
 * Service logic for delivery coordination and driver assignments.
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
 * Get the queue of accepted requests that have no active driver assignments.
 * A request is considered in the queue if:
 * 1. Its status is 'accepted'
 * 2. It does not have any active delivery assignment (i.e. no assignment in pending_driver, accepted, in_transit, or completed)
 */
export async function getAssignmentQueue() {
  const requests = await prisma.donationRequest.findMany({
    where: {
      status: 'accepted',
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
      status: 'accepted',
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
