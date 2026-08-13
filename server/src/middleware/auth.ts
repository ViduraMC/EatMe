import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';
import { verifyToken } from '../utils/jwt';
import { publicUserSelect } from '../types/auth';

/**
 * Verifies the Bearer token and attaches the current user to the request.
 *
 * The user is re-read from the database on every request rather than trusted
 * from the token body. It costs one indexed lookup, and it means an account
 * suspended by an admin stops working immediately instead of whenever the
 * token happens to expire.
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorised('Authentication required. Send a Bearer token.');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw ApiError.unauthorised('Authentication required. Send a Bearer token.');
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      // Covers expired, malformed and tampered tokens alike. The client cannot
      // act differently on the distinction, so it is not worth leaking.
      throw ApiError.unauthorised('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { userId: payload.userId },
      select: publicUserSelect,
    });

    if (!user) {
      throw ApiError.unauthorised('This account no longer exists');
    }

    if (user.status !== 'active') {
      throw ApiError.forbidden('This account is inactive. Contact an administrator.');
    }

    req.user = user;
    next();
  },
);
