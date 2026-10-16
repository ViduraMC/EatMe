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

// Per IP, per 15 minutes. Generous for a person, too low for a password script.
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const registerLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post(
  '/register',
  registerLimit,
  validateBody(registerSchema),
  asyncHandler(register),
);
router.post('/login', loginLimit, validateBody(loginSchema), asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));
// Same limit as login: it checks a password too.
router.delete(
  '/me',
  loginLimit,
  authenticate,
  validateBody(deleteAccountSchema),
  asyncHandler(deleteAccount),
);

export default router;
