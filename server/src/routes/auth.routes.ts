import { Router } from 'express';
import {
  deleteAccount,
  deleteAccountSchema,
  login,
  loginSchema,
  me,
  register,
  registerSchema,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const WINDOW = 15 * 60 * 1000;

// Per IP, per 15 minutes. Generous for a person, too low for a password script.
const loginIpLimit = rateLimit({ windowMs: WINDOW, max: 30 });
const registerLimit = rateLimit({ windowMs: WINDOW, max: 10 });
// Per account being signed in to. Stops a script that rotates IP addresses (or
// fakes X-Forwarded-For) from guessing one person's password indefinitely.
const loginAccountLimit = rateLimit({
  windowMs: WINDOW,
  max: 10,
  key: (req) =>
    typeof req.body?.email === 'string'
      ? `email:${req.body.email.trim().toLowerCase()}`
      : undefined,
});
// Per signed-in user: deleting an account re-checks the password.
const deleteLimit = rateLimit({
  windowMs: WINDOW,
  max: 5,
  key: (req) => (req.user ? `user:${req.user.userId}` : undefined),
});

router.post(
  '/register',
  registerLimit,
  validateBody(registerSchema),
  asyncHandler(register),
);
router.post(
  '/login',
  loginIpLimit,
  loginAccountLimit,
  validateBody(loginSchema),
  asyncHandler(login),
);
router.get('/me', authenticate, asyncHandler(me));
router.delete(
  '/me',
  authenticate,
  deleteLimit,
  validateBody(deleteAccountSchema),
  asyncHandler(deleteAccount),
);

export default router;
