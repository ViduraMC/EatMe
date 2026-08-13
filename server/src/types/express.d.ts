import type { PublicUser } from './auth';

/**
 * Adds req.user, populated by the authenticate middleware.
 *
 * It is optional because unprotected routes never set it. Anything behind
 * authenticate can rely on it being present.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export {};
