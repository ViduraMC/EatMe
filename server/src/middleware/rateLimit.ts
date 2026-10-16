import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

/**
 * Caps how many requests one client can make to a route in a time window.
 *
 * Mounted on sign in and registration, the two endpoints anyone can reach
 * without a token. Without it a script could try thousands of passwords against
 * one account, or flood the database with fake sign-ups.
 *
 * By default the client is its IP address. `key` can count something else
 * instead, such as the email being signed in to, so that faking a new IP on
 * every attempt does not reset the count for one account.
 *
 * shortcut: counts live in this process's memory, so they reset on restart and
 * are not shared between instances; move to Redis if the API ever runs on more
 * than one instance.
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  key?: (req: Request) => string | undefined;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    // req.ip is the real client address because app.ts trusts the host's proxy.
    const key = options.key?.(req) ?? req.ip ?? 'unknown';
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    // Drop expired entries now and then so the map cannot grow without limit.
    if (hits.size > 10_000) {
      for (const [ip, value] of hits) if (value.resetAt <= now) hits.delete(ip);
    }

    if (entry.count > options.max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      next(
        new ApiError(429, 'Too many attempts. Please wait a few minutes and try again.'),
      );
      return;
    }

    next();
  };
}
