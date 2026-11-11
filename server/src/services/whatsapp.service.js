import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';

/**
 * WhatsApp Business Cloud API (Meta). Messages started by the store must use an approved
 * template, so every message here is a template. Template names and their body text are in
 * docs/whatsapp-templates.md.
 *
 * With no credentials set, messages are logged instead, so checkout and admin still work in
 * development.
 */

export const TEMPLATES = {
  ownerNewOrder: 'owner_new_order',
  orderReceived: 'order_received',
  orderStatus: 'order_status',
  passwordReset: 'password_reset',
};

export const whatsappConfigured = () =>
  Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN);

/**
 * Turns what people type into the international digits WhatsApp needs.
 * 0801 234 5678 -> 2348012345678, +234 801-234-5678 -> 2348012345678.
 */
export function toWhatsAppNumber(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith('0')) return `234${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** Sends one template message. Resolves { sent: boolean }. Throws only on a real API failure. */
export async function sendTemplate({ to, template, params = [] }) {
  const number = toWhatsAppNumber(to);
  if (!number) {
    logger.warn(`WhatsApp skipped (no valid number) for template ${template}`);
    return { sent: false };
  }

  if (!whatsappConfigured()) {
    logger.warn(
      `WhatsApp not configured. Would send ${template} to ${number}: ${params.join(' | ')}`
    );
    return { sent: false };
  }

  let res;
  try {
    res = await fetch(
      `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: number,
          type: 'template',
          template: {
            name: template,
            language: { code: env.WHATSAPP_TEMPLATE_LANG },
            components: [
              {
                type: 'body',
                parameters: params.map((p) => ({
                  type: 'text',
                  // WhatsApp rejects newlines and long runs of spaces inside a parameter.
                  text: String(p).replace(/\s+/g, ' ').trim(),
                })),
              },
            ],
          },
        }),
      }
    );
  } catch {
    throw new HttpError(502, 'Could not reach WhatsApp. The message was not sent.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new HttpError(
      502,
      `WhatsApp rejected the ${template} message: ${body.error?.message ?? res.status}`
    );
  }
  return { sent: true };
}
