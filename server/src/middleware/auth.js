import { User } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from './asyncHandler.js';
import { SESSION_COOKIE, verifyToken } from '../services/auth.service.js';

/** Requires a valid session cookie and loads the (active) user into req.user. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) throw new HttpError(401, 'Please log in to continue.');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again.');
  }

  const user = await User.findById(payload.sub).lean();
  if (!user || !user.isActive) throw new HttpError(401, 'Please log in to continue.');

  req.user = user;
  next();
});

/** Role check (CLAUDE.md non-negotiable 4). Use after requireAuth. */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Please log in to continue.'));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to do that.'));
    }
    return next();
  };

/** Attaches req.user when a valid session exists. Never fails: guests simply have no req.user. */
export const optionalAuth = async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).lean();
    if (user && user.isActive) req.user = user;
  } catch {
    /* expired or invalid cookie: treat as a guest */
  }
  return next();
};
