import type { Response } from 'express';

/**
 * The response envelope agreed in docs/05-api-plan.md.
 *
 *   success: { "success": true, "data": { ... } }
 *   error:   { "success": false, "message": "Human readable message" }
 *
 * Every route uses these so the mobile client can rely on one shape.
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, data });
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  details?: unknown,
): Response {
  const body: Record<string, unknown> = { success: false, message };
  if (details !== undefined) {
    body.details = details;
  }
  return res.status(statusCode).json(body);
}
