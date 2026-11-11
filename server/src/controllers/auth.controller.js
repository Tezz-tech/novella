import { asyncHandler } from '../middleware/asyncHandler.js';
import { User } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import {
  SESSION_COOKIE,
  cookieOptions,
  login,
  publicUser,
  register,
  requestPasswordReset,
  resetPassword,
  signToken,
} from '../services/auth.service.js';

const setSession = (res, user) => res.cookie(SESSION_COOKIE, signToken(user), cookieOptions());

export const postRegister = asyncHandler(async (req, res) => {
  const user = await register(req.body);
  setSession(res, user);
  res.status(201).json({ success: true, data: publicUser(user) });
});

export const postLogin = asyncHandler(async (req, res) => {
  const user = await login(req.body);
  setSession(res, user);
  res.json({ success: true, data: publicUser(user) });
});

export const postLogout = (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.json({ success: true, data: { loggedOut: true } });
};

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  if (!user) throw new HttpError(401, 'Please log in to continue.');
  res.json({ success: true, data: publicUser(user) });
});

// Same response whether or not the email exists (no account enumeration).
export const postForgotPassword = asyncHandler(async (req, res) => {
  await requestPasswordReset(req.body.email);
  res.json({
    success: true,
    data: { message: 'If an account exists for that email, a reset link is on its way.' },
  });
});

export const postResetPassword = asyncHandler(async (req, res) => {
  await resetPassword(req.body.token, req.body.password);
  res.json({
    success: true,
    data: { message: 'Your password has been reset. You can log in now.' },
  });
});
