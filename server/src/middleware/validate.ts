import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
import { ApiError } from '../utils/apiError';

/**
 * Validates and replaces req.body with the parsed result.
 *
 * Replacing the body matters: after this runs, the handler is working with
 * coerced, trimmed, known-shaped data, and any extra fields a client sent have
 * been stripped. That is what stops a client setting, say, role: "admin" on an
 * endpoint that never meant to accept it.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(ApiError.badRequest('Validation failed', result.error.flatten().fieldErrors));
      return;
    }

    req.body = result.data;
    next();
  };
}
