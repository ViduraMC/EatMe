import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not catch rejected promises from an async handler; the request
 * would hang instead of returning 500. Wrapping a handler in this forwards any
 * rejection to the error handler.
 *
 * Every async route handler and async middleware must be wrapped.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
