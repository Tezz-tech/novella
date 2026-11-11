import { TEMPLATES, sendTemplate } from './whatsapp.service.js';
import { env } from '../config/env.js';
import { formatNaira } from '../utils/money.js';

/**
 * Message content for each WhatsApp template. The order of params must match the body
 * placeholders {{1}}, {{2}}… of the approved template (docs/whatsapp-templates.md).
 */

const firstName = (name = '') => name.split(' ')[0] || 'there';

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

export const orderReceivedParams = (order) => [
  firstName(order.customer.name),
  order.orderNumber,
  formatNaira(order.total),
];

const STATUS_WORDS = {
  processing: 'being prepared',
  shipped: 'on its way',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

export const orderStatusParams = (
  order,
  status,
  { courier, trackingNumber, trackingUrl, note } = {}
) => {
  let extra = note || '';
  if (status === 'shipped') {
    const parts = [
      courier && `Courier: ${courier}`,
      trackingNumber && `Tracking: ${trackingNumber}`,
      trackingUrl,
    ].filter(Boolean);
    extra = parts.length ? parts.join('. ') : 'We will update you when it arrives.';
  } else if (!extra) {
    extra =
      status === 'delivered'
        ? 'Thank you for shopping with Novelle Tech.'
        : 'We will keep you posted.';
  }
  return [firstName(order.customer.name), order.orderNumber, STATUS_WORDS[status] ?? status, extra];
};

/** Owner alert for a newly paid order. Needs OWNER_WHATSAPP_NUMBER. */
export function notifyOwnerNewOrder(order, stockIssues) {
  if (!env.OWNER_WHATSAPP_NUMBER) return Promise.resolve({ sent: false });
  return sendTemplate({
    to: env.OWNER_WHATSAPP_NUMBER,
    template: TEMPLATES.ownerNewOrder,
    params: ownerNewOrderParams(order, stockIssues),
  });
}

/** Customer message: payment received. */
export function notifyCustomerOrderReceived(order) {
  return sendTemplate({
    to: order.customer.phone,
    template: TEMPLATES.orderReceived,
    params: orderReceivedParams(order),
  });
}

/** Customer message: status changed. */
export function notifyCustomerStatus(order, status, extra) {
  return sendTemplate({
    to: order.customer.phone,
    template: TEMPLATES.orderStatus,
    params: orderStatusParams(order, status, extra),
  });
}

/** Customer message: password reset link (valid 30 minutes). */
export function notifyPasswordReset(user, url) {
  return sendTemplate({
    to: user.phone,
    template: TEMPLATES.passwordReset,
    params: [firstName(user.name), url],
  });
}
