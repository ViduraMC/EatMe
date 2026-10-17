import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
import { ApiError } from '../utils/apiError';

/**
 * Restricts a route to one or more roles. Always used after authenticate.
 *
 *   router.get('/mine', authenticate, requireRole('donor'), handler)
 *
 * The client side role based navigation stack hides screens a role should not
 * see, but that is only a convenience. This is the actual control: a donor who
 * hand-crafts a request to a coordinator route still gets a 403.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      // authenticate was not mounted before this. A programming error, but fail
      // closed rather than letting the request through.
      next(ApiError.unauthorised());
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        ApiError.forbidden(
          `This route is restricted to: ${roles.join(', ')}. You are signed in as ${req.user.role}.`,
        ),
      );
      return;
    }

    next();
  };
}
