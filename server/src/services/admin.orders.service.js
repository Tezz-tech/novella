import { Order, Refund } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import { escapeRegex } from '../utils/text.js';
import { formatNaira, nairaToKobo } from '../utils/money.js';
import { logFromRequest, snapshot } from './activity.service.js';
import { refundTransaction } from './paystack.service.js';
import { restockVariant, refreshCombosContaining } from './stock.service.js';

/** Allowed status moves (docs/01 order lifecycle). Anything else is refused. */
export const TRANSITIONS = {
  pending_payment: ['cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  refunded: [],
};

const SUMMARY =
  'orderNumber createdAt status paymentStatus total customer.name customer.phone delivery.method delivery.address.state delivery.address.city items.qty stockIssue';

export async function listOrders({
  status,
  paymentStatus,
  from,
  to,
  state,
  q,
  page,
  limit,
  format,
}) {
  const match = {};
  if (status) match.status = status;
  if (paymentStatus) match.paymentStatus = paymentStatus;
  if (state) match['delivery.address.state'] = state;
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(new Date(to).getTime() + 86_400_000 - 1);
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    match.$or = [
      { orderNumber: rx },
      { 'customer.name': rx },
      { 'customer.email': rx },
      { 'customer.phone': rx },
    ];
  }

  const tabs = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts = Object.fromEntries(tabs.map((t) => [t._id, t.count]));
  counts.all = tabs.reduce((n, t) => n + t.count, 0);

  if (format === 'csv') {
    const rows = await Order.find(match).sort({ createdAt: -1 }).limit(5000).lean();
    return { csv: toCsv(rows), counts };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Order.find(match).select(SUMMARY).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(match),
  ]);
  return {
    items: items.map((o) => ({
      ...o,
      itemCount: o.items.reduce((n, i) => n + i.qty, 0),
      items: undefined,
    })),
    counts,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = [
    'Order',
    'Date',
    'Status',
    'Payment',
    'Customer',
    'Email',
    'Phone',
    'State',
    'Items',
    'Total (NGN)',
  ];
  const lines = rows.map((o) =>
    [
      o.orderNumber,
      new Date(o.createdAt).toISOString(),
      o.status,
      o.paymentStatus,
      o.customer.name,
      o.customer.email,
      o.customer.phone,
      o.delivery?.address?.state ?? '',
      o.items.reduce((n, i) => n + i.qty, 0),
      (o.total / 100).toFixed(2),
    ]
      .map(esc)
      .join(',')
  );
  return [header.map(esc).join(','), ...lines].join('\n');
}

export async function getOrderAdmin(id) {
  const order = await Order.findById(id).lean();
  if (!order) throw new HttpError(404, 'Order not found');
  const refunds = await Refund.find({ order: id }).sort({ createdAt: -1 }).lean();
  return { ...order, refunds };
}

export async function changeStatus(
  req,
  id,
  { status, note, courier, trackingNumber, trackingUrl }
) {
  const order = await Order.findById(id);
  if (!order) throw new HttpError(404, 'Order not found');
  if (!(TRANSITIONS[order.status] ?? []).includes(status)) {
    throw new HttpError(400, `An order cannot move from “${order.status}” to “${status}”.`);
  }
  const before = { status: order.status, fulfilment: order.fulfilment };
  order.status = status;
  if (status === 'shipped') {
    order.fulfilment.courier = courier ?? order.fulfilment.courier;
    order.fulfilment.trackingNumber = trackingNumber ?? order.fulfilment.trackingNumber;
    order.fulfilment.trackingUrl = trackingUrl ?? order.fulfilment.trackingUrl;
    order.fulfilment.shippedAt = new Date();
  }
  if (status === 'delivered') order.fulfilment.deliveredAt = new Date();
  order.timeline.push({
    status,
    note: note ?? '',
    by: req.user?.email ?? 'admin',
    at: new Date(),
  });
  await order.save();

  await logFromRequest(req, {
    action: 'status',
    entity: 'order',
    entityId: id,
    before,
    after: { status, fulfilment: order.fulfilment },
  });
  return getOrderAdmin(id);
}

export async function addNote(req, id, adminNotes) {
  const order = await Order.findById(id);
  if (!order) throw new HttpError(404, 'Order not found');
  const before = { adminNotes: order.adminNotes };
  order.adminNotes = adminNotes;
  await order.save();
  await logFromRequest(req, {
    action: 'notes',
    entity: 'order',
    entityId: id,
    before,
    after: { adminNotes },
  });
  return { adminNotes };
}

/** Fixes a delivery address (docs/05). Recorded, with before and after. */
export async function editAddress(req, id, address) {
  const order = await Order.findById(id);
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.delivery.method !== 'delivery')
    throw new HttpError(400, 'This order is for pickup, so it has no delivery address');
  const before = snapshot(order.delivery.address);
  order.delivery.address = {
    line1: address.line1,
    line2: address.line2 ?? '',
    landmark: address.landmark ?? '',
    city: address.city,
    state: address.state,
  };
  await order.save();
  await logFromRequest(req, {
    action: 'address',
    entity: 'order',
    entityId: id,
    before,
    after: snapshot(order.delivery.address),
  });
  return getOrderAdmin(id);
}

/**
 * Refund through Paystack (docs/04). Creates a pending Refund; the webhook marks it processed or failed.
 * Optionally puts the stock back. Amounts are naira here and kobo at Paystack.
 */
export async function refundOrder(req, id, { amountNaira, reason, restock }) {
  const order = await Order.findById(id);
  if (!order) throw new HttpError(404, 'Order not found');
  if (!['paid', 'partially_refunded'].includes(order.paymentStatus)) {
    throw new HttpError(400, 'Only paid orders can be refunded');
  }
  const refunded = await Refund.aggregate([
    { $match: { order: order._id, status: { $in: ['pending', 'processed'] } } },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]);
  const alreadyRefunded = refunded[0]?.sum ?? 0;
  const remaining = order.total - alreadyRefunded;
  const amount = amountNaira ? nairaToKobo(amountNaira) : remaining;
  if (amount <= 0 || amount > remaining)
    throw new HttpError(400, `The refund can be at most ${formatNaira(remaining)}`);

  const reference = order.payment.reference;
  const data = await refundTransaction({
    transaction: reference,
    amount,
    merchant_note: reason || `Refund for ${order.orderNumber}`,
    customer_note: 'Your refund is on its way.',
  });

  const refund = await Refund.create({
    order: order._id,
    paymentReference: reference,
    amount,
    reason,
    paystackRefundId: data?.id ? String(data.id) : null,
    status: 'pending',
    restockItems: Boolean(restock),
    by: req.user?._id ?? null,
  });

  if (restock) {
    for (const item of order.items) {
      if (item.comboItems?.length) {
        for (const child of item.comboItems)
          await restockVariant(child.product, child.variant, child.qty * item.qty);
        for (const child of item.comboItems) await refreshCombosContaining(child.product);
      } else {
        await restockVariant(item.product, item.variant, item.qty);
        await refreshCombosContaining(item.product);
      }
    }
  }

  order.timeline.push({
    status: order.status,
    note: `Refund of ${formatNaira(amount)} requested`,
    by: req.user?.email ?? 'admin',
    at: new Date(),
  });
  await order.save();
  await logFromRequest(req, {
    action: 'refund',
    entity: 'order',
    entityId: id,
    after: { amount, reason, restock: Boolean(restock), refundId: refund._id },
  });
  return refund;
}
