import { prisma } from '../config/prisma';

export async function getAdminStats() {
  const [
    totalUsers,
    activeUsers,
    totalListings,
    openListings,
    totalRequests,
    pendingRequests,
    totalAssignments,
    completedAssignments,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        status: 'active',
      },
    }),

    prisma.donationListing.count(),

    prisma.donationListing.count({
      where: {
        status: 'open',
      },
    }),

    prisma.donationRequest.count(),

    prisma.donationRequest.count({
      where: {
        status: 'pending',
      },
    }),

    prisma.deliveryAssignment.count(),

    prisma.deliveryAssignment.count({
      where: {
        status: 'completed',
      },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
    },
    listings: {
      total: totalListings,
      open: openListings,
    },
    requests: {
      total: totalRequests,
      pending: pendingRequests,
    },
    assignments: {
      total: totalAssignments,
      completed: completedAssignments,
    },
  };
}
