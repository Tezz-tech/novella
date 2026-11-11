import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { registerBody, loginBody, forgotBody, resetBody } from '../validators/auth.validators.js';
import {
  postRegister,
  postLogin,
  postLogout,
  getMe,
  postForgotPassword,
  postResetPassword,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', authLimiter, validate(registerBody), postRegister);
router.post('/login', authLimiter, validate(loginBody), postLogin);
router.post('/logout', postLogout);
router.get('/me', requireAuth, getMe);
router.post('/forgot-password', authLimiter, validate(forgotBody), postForgotPassword);
router.post('/reset-password', authLimiter, validate(resetBody), postResetPassword);

export default router;
