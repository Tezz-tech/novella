import nodemailer from 'nodemailer';
import { env, isProd } from './env.js';
import { logger } from '../utils/logger.js';

let transport = null;

function getTransport() {
  if (!env.SMTP_HOST) return null;
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transport;
}

/**
 * Sends one email. When SMTP is not configured the message is logged instead, so flows like
 * password reset still work in development. Returns { sent: boolean }.
 */
export async function sendMail({ to, subject, html, text }) {
  const t = getTransport();
  if (!t) {
    logger.warn(`Email not sent (SMTP not configured): "${subject}" to ${to}`);
    if (!isProd) logger.info(`  ${text.replace(/\n/g, '\n  ')}`);
    return { sent: false };
  }
  await t.sendMail({
    from: env.MAIL_FROM || 'Novelle Tech <no-reply@localhost>',
    to,
    subject,
    html,
    text,
  });
  return { sent: true };
}
