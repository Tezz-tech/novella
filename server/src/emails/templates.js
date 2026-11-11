/** Branded email templates: black and rose-pink, crown wordmark in text (no images, so they load everywhere). */

const escape = (s) =>
  String(s ?? '').replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]
  );

export function layout({ title, preheader = '', body }) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escape(title)}</title></head>
  <body style="margin:0;background:#07040A;font-family:Montserrat,Arial,sans-serif;color:#FFF0F6;">
    <span style="display:none;max-height:0;overflow:hidden;">${escape(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07040A;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0E0910;border:1px solid #241A24;border-radius:20px;padding:36px 28px;">
          <tr><td align="center">
            <p style="margin:0;font-family:Georgia,serif;font-size:26px;letter-spacing:2px;color:#E88FBF;">NOVELLE</p>
            <p style="margin:4px 0 0;font-size:11px;letter-spacing:8px;color:#F5A8CC;">TECH</p>
          </td></tr>
          <tr><td style="padding-top:28px;font-size:15px;line-height:1.6;color:#FFF0F6;">${body}</td></tr>
          <tr><td style="padding-top:28px;border-top:1px solid #241A24;font-size:12px;color:rgba(255,240,246,0.55);text-align:center;">
            Smart Deals. Pretty Prices. ✨<br />Novelle Tech
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function passwordResetEmail({ name, url }) {
  const safeName = escape(name || 'there');
  const safeUrl = escape(url);
  return {
    subject: 'Reset your Novelle Tech password',
    text: `Hi ${name || 'there'},\n\nReset your password using this link (valid for 30 minutes):\n${url}\n\nIf you did not ask for this, you can ignore this email.`,
    html: layout({
      title: 'Reset your password',
      preheader: 'Reset link valid for 30 minutes',
      body: `<p>Hi ${safeName},</p>
<p>We received a request to reset your password. The link below is valid for 30 minutes.</p>
<p style="text-align:center;margin:28px 0;"><a href="${safeUrl}" style="display:inline-block;background:#E88FBF;color:#07040A;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;">Reset password</a></p>
<p style="font-size:13px;color:rgba(255,240,246,0.6);">If you did not ask for this, you can safely ignore this email.</p>`,
    }),
  };
}

const itemsHtml = (items, money) =>
  items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #241A24;">${escape(i.name)}${i.variantLabel ? ` · ${escape(i.variantLabel)}` : ''} × ${i.qty}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #241A24;">${money(i.lineTotal)}</td></tr>`
    )
    .join('');

const totalsHtml = (order, money) => `
<table role="presentation" width="100%" style="margin-top:12px;font-size:14px;">
  <tr><td>Subtotal</td><td align="right">${money(order.subtotal)}</td></tr>
  <tr><td>Delivery</td><td align="right">${money(order.deliveryFee)}</td></tr>
  ${order.discount ? `<tr><td>Discount</td><td align="right">−${money(order.discount)}</td></tr>` : ''}
  <tr><td style="padding-top:8px;font-weight:600;">Total</td><td align="right" style="padding-top:8px;font-weight:600;">${money(order.total)}</td></tr>
</table>`;

/** Sent to the customer once payment is confirmed. */
export function orderReceivedEmail({ order, money }) {
  const first = order.customer.name.split(' ')[0];
  const delivery =
    order.delivery.method === 'pickup'
      ? 'Pickup: we will confirm the pickup time with you.'
      : `Delivering to ${escape(order.delivery.address.line1)}, ${escape(order.delivery.address.city)}, ${escape(order.delivery.address.state)}.`;
  return {
    subject: `Order ${order.orderNumber} received`,
    text: `Hi ${first}, thank you. Order ${order.orderNumber} is paid. Total ${money(order.total)}.`,
    html: layout({
      title: `Order ${order.orderNumber}`,
      preheader: `Thank you. Order ${order.orderNumber} is paid.`,
      body: `<p>Hi ${escape(first)},</p>
<p>Thank you for shopping with us. Your payment is confirmed and we have started on order <strong>${escape(order.orderNumber)}</strong>.</p>
<table role="presentation" width="100%" style="margin:20px 0;">${itemsHtml(order.items, money)}</table>
${totalsHtml(order, money)}
<p style="margin-top:20px;">${delivery}</p>
<p style="font-size:13px;color:rgba(255,240,246,0.6);">You can track this order any time with its number and your email address.</p>`,
    }),
  };
}

/** Sent to the store owner for every new paid order. Flags stock problems at the top. */
export function adminNewOrderEmail({ order, money, stockIssues = [] }) {
  const warn = stockIssues.length
    ? `<p style="color:#F5C451;"><strong>Stock short:</strong> ${escape(stockIssues.join(', '))}. Check stock before shipping.</p>`
    : '';
  const addr =
    order.delivery.method === 'pickup'
      ? 'Pickup'
      : [
          order.delivery.address.line1,
          order.delivery.address.landmark,
          order.delivery.address.city,
          order.delivery.address.state,
        ]
          .filter(Boolean)
          .map(escape)
          .join(', ');
  return {
    subject: `New paid order ${order.orderNumber}${stockIssues.length ? ' (stock check needed)' : ''}`,
    text: `New paid order ${order.orderNumber}. Total ${money(order.total)}. Customer ${order.customer.name}, ${order.customer.phone}.`,
    html: layout({
      title: `New order ${order.orderNumber}`,
      body: `${warn}<p><strong>${escape(order.orderNumber)}</strong> · ${money(order.total)}</p>
<p>${escape(order.customer.name)} · ${escape(order.customer.phone)} · ${escape(order.customer.email)}</p>
<p>${addr}</p>
<table role="presentation" width="100%">${itemsHtml(order.items, money)}</table>${totalsHtml(order, money)}`,
    }),
  };
}

const STATUS_COPY = {
  processing: {
    title: 'We are preparing your order',
    line: 'Your payment is confirmed and we are packing your order.',
  },
  shipped: { title: 'Your order is on its way', line: 'Your order has left our store.' },
  delivered: {
    title: 'Your order was delivered',
    line: 'We hope you love it. Thank you for shopping with us.',
  },
  cancelled: {
    title: 'Your order was cancelled',
    line: 'Your order has been cancelled. If you were charged, we will refund it.',
  },
};

/** Sent to the customer on each status change they should know about. */
export function orderStatusEmail({
  order,
  status,
  courier,
  trackingNumber,
  trackingUrl,
  note,
  money,
}) {
  const copy = STATUS_COPY[status] ?? {
    title: `Order ${status}`,
    line: 'Your order has been updated.',
  };
  const first = order.customer.name.split(' ')[0];
  const tracking =
    status === 'shipped' && (courier || trackingNumber || trackingUrl)
      ? `<p>${courier ? `Courier: ${escape(courier)}<br />` : ''}${trackingNumber ? `Tracking number: ${escape(trackingNumber)}<br />` : ''}${trackingUrl ? `<a href="${escape(trackingUrl)}" style="color:#E88FBF;">Track your parcel</a>` : ''}</p>`
      : '';
  return {
    subject: `${copy.title} · ${order.orderNumber}`,
    text: `Hi ${first}, ${copy.line} Order ${order.orderNumber}.`,
    html: layout({
      title: copy.title,
      preheader: copy.line,
      body: `<p>Hi ${escape(first)},</p><p>${escape(copy.line)}</p>
<p>Order <strong>${escape(order.orderNumber)}</strong> · Total ${money(order.total)}</p>
${tracking}${note ? `<p style="color:rgba(255,240,246,0.7);">${escape(note)}</p>` : ''}`,
    }),
  };
}
