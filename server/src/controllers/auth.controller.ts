import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { sendSuccess } from '../utils/apiResponse';
import { signToken } from '../utils/jwt';
import { publicUserSelect } from '../types/auth';

/** Cost factor for bcrypt. 10 is the usual default and is fast enough on a laptop. */
const BCRYPT_ROUNDS = 10;

/**
 * Roles a person is allowed to sign themselves up as.
 *
 * "admin" is missing on purpose. Admin accounts are created by the seed script
 * or by another admin, never through a public endpoint, otherwise anyone could
 * POST their way to full platform access.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(150),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  phone: z.string().trim().min(9, 'Enter a valid phone number').max(20),
  address: z.string().trim().min(5, 'Enter a full address'),
  role: z.enum(['donor', 'recipient'], {
    errorMap: () => ({
      message: 'Role must be one of: donor, recipient',
    }),
  }),
  organisationName: z.string().trim().max(150).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/** POST /api/auth/register */
export async function register(req: Request, res: Response): Promise<void> {
  const input = req.body as z.infer<typeof registerSchema>;

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { userId: true },
  });

  if (existing) {
    throw ApiError.conflict('An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone,
      address: input.address,
      role: input.role,
      status: input.role === 'recipient' ? 'pending' : 'active',
      organisationName: input.organisationName ?? null,
    },
    select: publicUserSelect,
  });

  const token = signToken({ userId: user.userId, role: user.role });

  sendSuccess(res, { user, token }, 201);
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  const input = req.body as z.infer<typeof loginSchema>;

  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // One message for "no such email" and "wrong password" alike. Telling them
  // apart would let anyone check which email addresses have accounts.
  const genericFailure = ApiError.unauthorised('Invalid email or password');

  if (!user) {
    // Still hash something so a missing account does not answer measurably
    // faster than a wrong password.
    await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    throw genericFailure;
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw genericFailure;
  }

  if (user.status === 'pending') {
    throw ApiError.forbidden('Your account is awaiting administrator approval.');
  }

  if (user.status === 'rejected') {
    throw ApiError.forbidden(
      'Your registration was not approved. Contact an administrator.',
    );
  }

  if (user.status === 'inactive') {
    throw ApiError.forbidden('This account is inactive. Contact an administrator.');
  }

  const token = signToken({ userId: user.userId, role: user.role });

  // Rebuild the response through the public shape so passwordHash, which was
  // selected above in order to compare it, cannot escape.
  const { passwordHash: _passwordHash, ...safeUser } = user;

  sendSuccess(res, { user: safeUser, token });
}

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password to confirm'),
});

/**
 * DELETE /api/auth/me
 *
 * Google Play requires that anyone who can sign up in the app can also delete
 * their account from inside it. Donors and recipients sign themselves up, so
 * they get this; staff accounts (coordinator, driver, admin) are created and
 * removed by an administrator.
 *
 * The row is anonymised rather than deleted. Listings, requests and deliveries
 * point at it, and the admin reports are built on that history, so every
 * personal detail is wiped and the account is closed, but the row stays.
 */
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const { password } = req.body as z.infer<typeof deleteAccountSchema>;
  const userId = req.user!.userId;

  if (req.user!.role !== 'donor' && req.user!.role !== 'recipient') {
    throw ApiError.forbidden('Staff accounts are removed by an administrator.');
  }

  const account = await prisma.user.findUniqueOrThrow({ where: { userId } });
  if (!(await bcrypt.compare(password, account.passwordHash))) {
    throw ApiError.badRequest('That password is not correct');
  }

  // A driver may already be on the way. Closing the account now would strand
  // that delivery, so the person finishes or cancels it first.
  const activeDelivery = await prisma.deliveryAssignment.findFirst({
    where: {
      status: { in: ['pending_driver', 'accepted', 'in_transit'] },
      request: { OR: [{ recipientId: userId }, { listing: { donorId: userId } }] },
    },
    select: { assignmentId: true },
  });
  if (activeDelivery) {
    throw ApiError.conflict(
      'You have a delivery in progress. Finish it before deleting your account.',
    );
  }

  // Unguessable, so the closed account can never be signed in to again.
  const unusableHash = await bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.donationListing.updateMany({
      where: { donorId: userId, status: { in: ['open', 'partially_claimed'] } },
      data: { status: 'cancelled' },
    }),
    prisma.donationRequest.updateMany({
      where: { recipientId: userId, status: 'pending' },
      data: { status: 'cancelled' },
    }),
    prisma.user.update({
      where: { userId },
      data: {
        name: 'Deleted user',
        email: `deleted-${userId}@deleted.invalid`,
        passwordHash: unusableHash,
        phone: '',
        address: '',
        organisationName: null,
        isAvailable: false,
        status: 'inactive',
      },
    }),
  ]);

  sendSuccess(res, { deleted: true });
}

/** GET /api/auth/me */
export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw ApiError.unauthorised();
  }
  sendSuccess(res, { user: req.user });
}
