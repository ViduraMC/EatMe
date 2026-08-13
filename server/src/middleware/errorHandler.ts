import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { sendError } from '../utils/apiResponse';
import { isProduction } from '../config/env';

/** Mounted after every route, so an unmatched path becomes a clean 404. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * The single place errors turn into responses.
 *
 * Anything that is not an ApiError is treated as an unexpected failure: it is
 * logged in full on the server, and the client is told only "Something went
 * wrong". That stops stack traces, SQL and file paths reaching the app.
 *
 * The unused `next` parameter has to stay. Express identifies error handling
 * middleware by its arity of four, and removing it turns this into an ordinary
 * middleware that never runs.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    sendError(res, err.statusCode, err.message, err.details);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 unique constraint, P2025 record not found. These are the two that
    // routinely surface from ordinary use.
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(', ')
        : 'field';
      sendError(res, 409, `That ${target} is already in use`);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 404, 'Not found');
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('[db] could not connect:', err.message);
    sendError(res, 503, 'The database is unavailable. Is MySQL running?');
    return;
  }

  console.error('[error]', err);

  sendError(
    res,
    500,
    'Something went wrong',
    isProduction ? undefined : String(err instanceof Error ? err.message : err),
  );
}
