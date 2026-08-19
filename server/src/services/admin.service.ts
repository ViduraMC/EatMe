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

export async function getAdminListings() {
  return prisma.donationListing.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      donor: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          organisationName: true,
          status: true,
        },
      },
      _count: {
        select: {
          requests: true,
        },
      },
    },
  });
}

export async function getAdminRequests() {
  return prisma.donationRequest.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      recipient: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          organisationName: true,
          status: true,
        },
      },
      listing: {
        select: {
          listingId: true,
          title: true,
          status: true,
          pickupAddress: true,
          donor: {
            select: {
              userId: true,
              name: true,
              organisationName: true,
            },
          },
        },
      },
      items: {
        include: {
          item: {
            select: {
              itemId: true,
              foodName: true,
              unit: true,
            },
          },
        },
      },
      _count: {
        select: {
          assignments: true,
        },
      },
    },
  });
}

export async function getAdminAssignments() {
  return prisma.deliveryAssignment.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      coordinator: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      driver: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          isAvailable: true,
          status: true,
        },
      },
      request: {
        select: {
          requestId: true,
          status: true,
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
              pickupAddress: true,
              donor: {
                select: {
                  userId: true,
                  name: true,
                  organisationName: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getAdminUsers() {
  return prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      userId: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      role: true,
      organisationName: true,
      isAvailable: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          listings: true,
          requests: true,
          coordinatedAssignments: true,
          drivenAssignments: true,
        },
      },
    },
  });
}
