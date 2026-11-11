import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Thin client for the Paystack API (docs/04-paystack.md). Amounts are always in kobo.
 * Uses the platform fetch; the secret key only ever lives on the server.
 */
const BASE = 'https://api.paystack.co';

async function call(path, { method = 'GET', body } = {}) {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new HttpError(
      503,
      'Online payment is not set up yet. Please choose pickup or contact the store.'
    );
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new HttpError(502, 'We could not reach the payment provider. Please try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    throw new HttpError(
      502,
      json.message || 'The payment provider returned an error. Please try again.'
    );
  }
  return json.data;
}

export const initializeTransaction = (payload) =>
  call('/transaction/initialize', { method: 'POST', body: payload });

export const verifyTransaction = (reference) =>
  call(`/transaction/verify/${encodeURIComponent(reference)}`);

export const refundTransaction = (payload) => call('/refund', { method: 'POST', body: payload });

/** x-paystack-signature is HMAC-SHA512 of the raw request body with the secret key. */
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.PAYSTACK_SECRET_KEY || !signature || !Buffer.isBuffer(rawBody)) return false;
  const expected = crypto
    .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
