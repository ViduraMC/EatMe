import { Prisma } from '@prisma/client';

/**
 * The only shape of a user that ever leaves the server.
 *
 * passwordHash is deliberately absent. Every query that returns a user must use
 * this select, so there is one place to check rather than one place per route.
 */
export const publicUserSelect = {
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
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
