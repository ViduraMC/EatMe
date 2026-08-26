import bcrypt from 'bcryptjs';

import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';

const ADMIN_STAFF_PASSWORD_ROUNDS = 10;

const adminUserSelect = {
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
} as const;

export interface CreateAdminStaffInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: 'coordinator' | 'driver';
}

export interface UpdateAdminStaffInput {
  name: string;
  email: string;
  phone: string;
  address: string;
}

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
    select: adminUserSelect,
  });
}

export async function createAdminStaff(input: CreateAdminStaffInput) {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      userId: true,
    },
  });

  if (existing) {
    throw ApiError.conflict('An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, ADMIN_STAFF_PASSWORD_ROUNDS);

  return prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      phone: input.phone.trim(),
      address: input.address.trim(),
      role: input.role,
      status: 'active',
      isAvailable: input.role === 'driver',
    },
    select: adminUserSelect,
  });
}

export async function updateAdminStaff(userId: number, input: UpdateAdminStaffInput) {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      userId: true,
      role: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role !== 'coordinator' && user.role !== 'driver') {
    throw ApiError.conflict(
      'Only coordinator and driver accounts can be edited by an administrator',
    );
  }

  const email = input.email.trim().toLowerCase();

  const existingEmail = await prisma.user.findFirst({
    where: {
      email,
      NOT: {
        userId,
      },
    },
    select: {
      userId: true,
    },
  });

  if (existingEmail) {
    throw ApiError.conflict('An account with that email already exists');
  }

  return prisma.user.update({
    where: {
      userId,
    },
    data: {
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      address: input.address.trim(),
    },
    select: adminUserSelect,
  });
}

export async function cancelAdminListing(listingId: number) {
  const listing = await prisma.donationListing.findUnique({
    where: {
      listingId,
    },
    select: {
      listingId: true,
      status: true,
    },
  });

  if (!listing) {
    throw ApiError.notFound('Donation listing not found');
  }

  if (listing.status === 'cancelled') {
    throw ApiError.conflict('This donation listing is already cancelled');
  }

  if (listing.status !== 'open') {
    throw ApiError.conflict(
      'Only open donation listings can be cancelled by an administrator',
    );
  }

  return prisma.donationListing.update({
    where: {
      listingId,
    },
    data: {
      status: 'cancelled',
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

export async function deleteAdminStaff(userId: number) {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      userId: true,
      name: true,
      role: true,
      _count: {
        select: {
          coordinatedAssignments: true,
          drivenAssignments: true,
        },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role !== 'coordinator' && user.role !== 'driver') {
    throw ApiError.conflict(
      'Only coordinator and driver accounts can be permanently deleted',
    );
  }

  const assignmentCount =
    user.role === 'coordinator'
      ? user._count.coordinatedAssignments
      : user._count.drivenAssignments;

  if (assignmentCount > 0) {
    throw ApiError.conflict(
      'This staff account has assignment history and cannot be permanently deleted. Deactivate the account instead.',
    );
  }

  await prisma.user.delete({
    where: {
      userId,
    },
  });

  return {
    userId: user.userId,
    name: user.name,
    role: user.role,
  };
}

export async function updateAdminUserStatus(
  userId: number,
  status: 'pending' | 'active' | 'inactive' | 'rejected',
) {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      userId: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role === 'admin') {
    throw ApiError.conflict('Administrator account status cannot be changed here');
  }

  if (status === 'pending') {
    throw ApiError.conflict('A user cannot be manually returned to pending status');
  }

  if (status === 'rejected') {
    if (user.role !== 'recipient') {
      throw ApiError.conflict('Only recipient registrations can be rejected');
    }

    if (user.status !== 'pending') {
      throw ApiError.conflict('Only pending recipient registrations can be rejected');
    }
  }

  if (user.status === 'pending' && status === 'inactive') {
    throw ApiError.conflict('A pending recipient must be approved or rejected first');
  }

  if (user.status === 'rejected' && status === 'inactive') {
    throw ApiError.conflict('A rejected recipient cannot be deactivated');
  }

  if (user.status === status) {
    throw ApiError.conflict(`This user is already ${status}`);
  }

  return prisma.user.update({
    where: {
      userId,
    },
    data: {
      status,
    },
    select: adminUserSelect,
  });
}
