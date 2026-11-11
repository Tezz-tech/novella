import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { HttpError } from '../utils/httpError.js';
import { sendMail } from '../config/mailer.js';
import { passwordResetEmail } from '../emails/templates.js';
import { logger } from '../utils/logger.js';
import { isProd } from '../config/env.js';

export const SESSION_COOKIE = 'nvt_session';
const RESET_TTL_MS = 30 * 60 * 1000;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone ?? '',
  role: u.role,
  addresses: u.addresses ?? [],
  createdAt: u.createdAt,
});

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

export const cookieOptions = () => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export async function register({ name, email, password, phone }) {
  if (await User.exists({ email: email.toLowerCase() })) {
    throw new HttpError(409, 'An account with this email already exists. Try logging in.');
  }
  return User.create({
    name,
    email,
    phone: phone ?? '',
    passwordHash: await hashPassword(password),
    role: 'customer',
  });
}

// Compared against when the email is unknown, so a login attempt takes the same time either way.
let dummyHash;
async function burnTime(password) {
  dummyHash ??= await hashPassword('timing-equaliser-not-a-real-password');
  await verifyPassword(password, dummyHash);
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  const invalid = () => new HttpError(401, 'Email or password is incorrect.');
  if (!user) {
    await burnTime(password);
    throw invalid();
  }
  if (!user.isActive)
    throw new HttpError(403, 'This account has been disabled. Contact the store.');
  if (!(await verifyPassword(password, user.passwordHash))) throw invalid();
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

/** Always resolves the same way to the caller, so the response never reveals whether an email exists. */
export async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) return;

  const raw = crypto.randomBytes(32).toString('hex');
  user.resetTokenHash = sha256(raw);
  user.resetTokenExpiresAt = new Date(Date.now() + RESET_TTL_MS);
  await user.save();

  const url = `${env.CLIENT_URL.replace(/\/$/, '')}/reset-password/${raw}`;
  const mail = passwordResetEmail({ name: user.name, url });
  try {
    await sendMail({ to: user.email, ...mail });
  } catch (err) {
    logger.error('Password reset email failed', err);
  }
  if (!isProd) logger.info(`Dev reset link for ${user.email}: ${url}`);
  return raw;
}

export async function resetPassword(raw, password) {
  const user = await User.findOne({
    resetTokenHash: sha256(raw),
    resetTokenExpiresAt: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpiresAt');
  if (!user)
    throw new HttpError(400, 'This reset link is invalid or has expired. Request a new one.');

  user.passwordHash = await hashPassword(password);
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;
  await user.save();
  return user;
}
