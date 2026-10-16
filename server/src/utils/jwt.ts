import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env';

/**
 * What we put inside the token. Deliberately small: only the id and the role.
 *
 * The role is included so the mobile app can pick its navigation stack without
 * an extra request, but the server never trusts it on its own. Protected routes
 * re-read the user from the database on every request, so a suspended account
 * or a changed role takes effect immediately rather than when the token expires.
 */
export interface JwtPayload {
  userId: number;
  role: UserRole;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** Throws if the token is missing, malformed, tampered with or expired. */
export function verifyToken(token: string): JwtPayload {
  // Pin the algorithm so a token cannot ask to be checked some other way.
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
}
