import { TEMPLATES, sendTemplate } from './whatsapp.service.js';
import { env } from '../config/env.js';
import { formatNaira } from '../utils/money.js';

/**
 * The only automatic WhatsApp message: an alert to the owner for each paid order.
 * Parameter order must match the body placeholders of the approved template
 * (docs/whatsapp-templates.md).
 */

export const ownerNewOrderParams = (order, stockIssues = []) => [
  order.orderNumber,
  order.customer.name,
  order.customer.phone,
  formatNaira(order.total),
  String(order.items.reduce((n, i) => n + i.qty, 0)),
  order.delivery.method === 'pickup'
    ? 'Pickup'
    : [order.delivery.address.line1, order.delivery.address.city, order.delivery.address.state]
        .filter(Boolean)
        .join(', '),
  stockIssues.length ? `Stock check needed: ${stockIssues.join(', ')}` : 'Stock OK',
];

/** Owner alert for a newly paid order. Needs OWNER_WHATSAPP_NUMBER. */
export function notifyOwnerNewOrder(order, stockIssues) {
  if (!env.OWNER_WHATSAPP_NUMBER) return Promise.resolve({ sent: false });
  return sendTemplate({
    to: env.OWNER_WHATSAPP_NUMBER,
    template: TEMPLATES.ownerNewOrder,
    params: ownerNewOrderParams(order, stockIssues),
  });
}
