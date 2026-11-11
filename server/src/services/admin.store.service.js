import crypto from 'node:crypto';
import {
  Order,
  Payment,
  Refund,
  Product,
  User,
  DeliveryZone,
  Coupon,
  Settings,
  Category,
  Brand,
  ActivityLog,
  Subscriber,
} from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import { nairaToKobo } from '../utils/money.js';
import { env } from '../config/env.js';
import { escapeRegex, slugify } from '../utils/text.js';
import { hashPassword } from '../utils/password.js';
import { sendMail } from '../config/mailer.js';
import { logger } from '../utils/logger.js';
import { logFromRequest, snapshot } from './activity.service.js';
import { confirmPayment } from './checkout.service.js';

const PAID_STATUSES = ['paid', 'partially_refunded', 'refunded'];
const DAY = 86_400_000;

/* ----------------------------- Dashboard ----------------------------- */

const RANGE_DAYS = { today: 1, '7d': 7, '30d': 30, '90d': 90 };

function windows(range) {
  const days = RANGE_DAYS[range] ?? 7;
  const end = new Date();
  const start = new Date(end.getTime() - days * DAY);
  const prevStart = new Date(start.getTime() - days * DAY);
  return { start, end, prevStart, prevEnd: start, days };
}

const pct = (now, before) => {
  if (!before) return now ? 100 : 0;
  return Math.round(((now - before) / before) * 1000) / 10;
};

async function paidTotals(from, to) {
  const [row] = await Order.aggregate([
    {
      $match: { paymentStatus: { $in: PAID_STATUSES }, 'payment.paidAt': { $gte: from, $lt: to } },
    },
    { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
  ]);
  return { revenue: row?.revenue ?? 0, count: row?.count ?? 0 };
}

export async function dashboard(range = '7d') {
  const w = windows(range);
  const [
    cur,
    prev,
    orders,
    newCustomers,
    refundsNow,
    refundsPrev,
    pendingToShip,
    series,
    byStatus,
    top,
    low,
    recent,
    byState,
  ] = await Promise.all([
    paidTotals(w.start, w.end),
    paidTotals(w.prevStart, w.prevEnd),
    Order.countDocuments({
      createdAt: { $gte: w.start, $lt: w.end },
      status: { $nin: ['pending_payment', 'cancelled'] },
    }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: w.start, $lt: w.end } }),
    Refund.aggregate([
      { $match: { status: 'processed', createdAt: { $gte: w.start, $lt: w.end } } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]),
    Refund.aggregate([
      { $match: { status: 'processed', createdAt: { $gte: w.prevStart, $lt: w.prevEnd } } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]),
    Order.countDocuments({ status: { $in: ['paid', 'processing'] } }),
    Order.aggregate([
      {
        $match: {
          paymentStatus: { $in: PAID_STATUSES },
          'payment.paidAt': { $gte: w.start, $lt: w.end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment.paidAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: w.start, $lt: w.end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      {
        $match: {
          paymentStatus: { $in: PAID_STATUSES },
          'payment.paidAt': { $gte: w.start, $lt: w.end },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          revenue: { $sum: '$items.lineTotal' },
          units: { $sum: '$items.qty' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]),
    lowStockRows(10),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select('orderNumber createdAt status paymentStatus total customer.name')
      .lean(),
    Order.aggregate([
      {
        $match: {
          paymentStatus: { $in: PAID_STATUSES },
          'payment.paidAt': { $gte: w.start, $lt: w.end },
        },
      },
      {
        $group: {
          _id: '$delivery.address.state',
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const refunded = refundsNow[0]?.sum ?? 0;
  const refundedPrev = refundsPrev[0]?.sum ?? 0;
  const aov = cur.count ? Math.round(cur.revenue / cur.count) : 0;
  const aovPrev = prev.count ? Math.round(prev.revenue / prev.count) : 0;

  return {
    range,
    kpis: {
      revenue: { value: cur.revenue, change: pct(cur.revenue, prev.revenue) },
      orders: { value: orders, change: 0 },
      averageOrder: { value: aov, change: pct(aov, aovPrev) },
      pendingToShip: { value: pendingToShip },
      newCustomers: { value: newCustomers },
      refunds: { value: refunded, change: pct(refunded, refundedPrev) },
    },
    series,
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    topProducts: top,
    lowStock: low,
    recentOrders: recent,
    ordersByState: byState,
  };
}

async function lowStockRows(limit) {
  const products = await Product.find({ status: 'active' }).select('name slug variants').lean();
  const rows = [];
  for (const p of products) {
    for (const v of p.variants) {
      if (v.isActive && v.stock <= (v.lowStockThreshold ?? 3)) {
        rows.push({
          productId: p._id,
          variantId: v._id,
          name: p.name,
          label: Object.values(v.optionValues ?? {}).join(' · ') || 'Standard',
          stock: v.stock,
          threshold: v.lowStockThreshold ?? 3,
        });
      }
    }
  }
  return rows.sort((a, b) => a.stock - b.stock).slice(0, limit);
}

/* ----------------------------- Payments ----------------------------- */

export async function listPayments({ status, source, from, to, page, limit }) {
  const match = {};
  if (status) match.status = status;
  if (source) match.source = source;
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(new Date(to).getTime() + DAY - 1);
  }
  const [items, total] = await Promise.all([
    Payment.find(match)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('order', 'orderNumber status paymentStatus')
      .lean(),
    Payment.countDocuments(match),
  ]);

  const [totals] = await Payment.aggregate([
    { $match: { ...match, status: 'success' } },
    {
      $group: {
        _id: null,
        collected: { $sum: '$amount' },
        fees: { $sum: { $ifNull: ['$raw.fees', 0] } },
      },
    },
  ]);
  const refunded = await Refund.aggregate([
    { $match: { status: 'processed' } },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]);
  const collected = totals?.collected ?? 0;
  const fees = totals?.fees ?? 0;
  const refundedSum = refunded[0]?.sum ?? 0;

  const now = Date.now();
  const flags = {
    amountMismatches: await Payment.countDocuments({ status: 'mismatch' }),
    paidWithStockIssue: await Order.countDocuments({ stockIssue: true }),
    pendingOverOneHour: await Order.countDocuments({
      status: 'pending_payment',
      paymentStatus: 'unpaid',
      createdAt: { $lt: new Date(now - 3_600_000) },
    }),
  };

  const refunds = await Refund.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('order', 'orderNumber')
    .lean();

  return {
    items,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    totals: { collected, fees, refunded: refundedSum, net: collected - fees - refundedSum },
    flags,
    refunds,
  };
}

export async function reverifyPayment(req, reference) {
  const result = await confirmPayment(reference, 'admin_reverify');
  await logFromRequest(req, {
    action: 'reverify',
    entity: 'payment',
    entityId: reference,
    after: { status: result.status },
  });
  return { status: result.status, orderNumber: result.order?.orderNumber };
}

/* ----------------------------- Customers ----------------------------- */

/**
 * Customers are built from their orders, so guests (who have no account) appear too.
 * "Registered" means an account with the same email exists.
 */
export async function listCustomers({ q, page, limit }) {
  const match = q
    ? {
        $or: [
          { 'customer.name': new RegExp(escapeRegex(q), 'i') },
          { 'customer.email': new RegExp(escapeRegex(q), 'i') },
          { 'customer.phone': new RegExp(escapeRegex(q), 'i') },
        ],
      }
    : {};
  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$customer.email',
        name: { $last: '$customer.name' },
        phone: { $last: '$customer.phone' },
        orders: { $sum: 1 },
        lifetimeSpend: {
          $sum: { $cond: [{ $in: ['$paymentStatus', PAID_STATUSES] }, '$total', 0] },
        },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
    { $sort: { lastOrderAt: -1 } },
  ]);
  const emails = rows.map((r) => r._id);
  const accounts = await User.find({ email: { $in: emails } })
    .select('email createdAt')
    .lean();
  const registered = new Map(accounts.map((u) => [u.email, u.createdAt]));
  const items = rows.map((r) => ({
    email: r._id,
    name: r.name,
    phone: r.phone,
    orders: r.orders,
    lifetimeSpend: r.lifetimeSpend,
    lastOrderAt: r.lastOrderAt,
    type: registered.has(r._id) ? 'registered' : 'guest',
    registeredAt: registered.get(r._id) ?? null,
  }));
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    page,
    limit,
    total: items.length,
    pages: Math.max(1, Math.ceil(items.length / limit)),
  };
}

export async function getCustomer(email) {
  const e = email.toLowerCase();
  const orders = await Order.find({ 'customer.email': e })
    .sort({ createdAt: -1 })
    .select('orderNumber createdAt status paymentStatus total items.qty delivery.address')
    .lean();
  if (!orders.length) throw new HttpError(404, 'Customer not found');
  const account = await User.findOne({ email: e })
    .select('name phone addresses wishlist createdAt')
    .populate('wishlist', 'name slug')
    .lean();
  const addresses = [
    ...new Map(
      orders
        .filter((o) => o.delivery?.address?.line1)
        .map((o) => [o.delivery.address.line1 + o.delivery.address.state, o.delivery.address])
    ).values(),
  ];
  return {
    email: e,
    type: account ? 'registered' : 'guest',
    account: account
      ? {
          name: account.name,
          phone: account.phone,
          createdAt: account.createdAt,
          wishlist: account.wishlist ?? [],
        }
      : null,
    addresses: account?.addresses?.length ? account.addresses : addresses,
    orders,
    lifetimeSpend: orders
      .filter((o) => PAID_STATUSES.includes(o.paymentStatus))
      .reduce((n, o) => n + o.total, 0),
  };
}

/* ----------------------------- Delivery zones ----------------------------- */

export const listZones = () => DeliveryZone.find().sort({ state: 1, city: 1 }).lean();

export async function createZone(req, input) {
  const doc = await DeliveryZone.create({ ...input, fee: nairaToKobo(input.fee) });
  await logFromRequest(req, {
    action: 'create',
    entity: 'delivery_zone',
    entityId: doc._id,
    after: snapshot(doc),
  });
  return doc;
}

export async function updateZone(req, id, input) {
  const doc = await DeliveryZone.findById(id);
  if (!doc) throw new HttpError(404, 'Zone not found');
  const before = snapshot(doc);
  if (input.fee !== undefined) doc.fee = nairaToKobo(input.fee);
  for (const k of ['state', 'city', 'etaText', 'isActive'])
    if (input[k] !== undefined) doc[k] = input[k];
  await doc.save();
  await logFromRequest(req, {
    action: 'update',
    entity: 'delivery_zone',
    entityId: id,
    before,
    after: snapshot(doc),
  });
  return doc;
}

export async function deleteZone(req, id) {
  const doc = await DeliveryZone.findByIdAndDelete(id);
  if (!doc) throw new HttpError(404, 'Zone not found');
  await logFromRequest(req, {
    action: 'delete',
    entity: 'delivery_zone',
    entityId: id,
    before: snapshot(doc),
  });
  return { deleted: true };
}

/** Sets one fee for many states at once (docs/05 "bulk-set fee for many states"). Whole-state zones only. */
export async function bulkZoneFee(req, { states, feeNaira, etaText }) {
  const fee = nairaToKobo(feeNaira);
  let updated = 0;
  for (const state of states) {
    const res = await DeliveryZone.updateOne(
      { state, city: '*' },
      { $set: { fee, ...(etaText ? { etaText } : {}) } },
      { upsert: true }
    );
    if (res.matchedCount || res.upsertedCount) updated += 1;
  }
  await logFromRequest(req, {
    action: 'bulk_fee',
    entity: 'delivery_zone',
    after: { states, fee, etaText },
  });
  return { updated };
}

/* ----------------------------- Coupons ----------------------------- */

const couponFields = (input) => {
  const out = { ...input };
  if (input.type === 'fixed' && input.value !== undefined) out.value = nairaToKobo(input.value);
  if (input.minSubtotalNaira !== undefined) out.minSubtotal = nairaToKobo(input.minSubtotalNaira);
  if (input.maxDiscountNaira !== undefined)
    out.maxDiscount = input.maxDiscountNaira ? nairaToKobo(input.maxDiscountNaira) : null;
  delete out.minSubtotalNaira;
  delete out.maxDiscountNaira;
  return out;
};

export const listCoupons = () => Coupon.find().sort({ createdAt: -1 }).lean();

export async function createCoupon(req, input) {
  const clash = await Coupon.exists({ code: input.code.toUpperCase() });
  if (clash) throw new HttpError(409, 'That coupon code already exists');
  const doc = await Coupon.create(couponFields({ ...input, code: input.code.toUpperCase() }));
  await logFromRequest(req, {
    action: 'create',
    entity: 'coupon',
    entityId: doc._id,
    after: snapshot(doc),
  });
  return doc;
}

export async function updateCoupon(req, id, input) {
  const doc = await Coupon.findById(id);
  if (!doc) throw new HttpError(404, 'Coupon not found');
  const before = snapshot(doc);
  Object.assign(doc, couponFields(input));
  await doc.save();
  await logFromRequest(req, {
    action: 'update',
    entity: 'coupon',
    entityId: id,
    before,
    after: snapshot(doc),
  });
  return doc;
}

/* ----------------------------- Settings and marketing ----------------------------- */

export async function getSettings() {
  return Settings.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

/** Owner only: store info, contacts, policies, FAQ, feature flags, delivery threshold. */
export async function updateSettings(req, input) {
  const before = await getSettings();
  const set = { ...input };
  if (input.freeDeliveryThresholdNaira !== undefined) {
    set.freeDeliveryThreshold = input.freeDeliveryThresholdNaira
      ? nairaToKobo(input.freeDeliveryThresholdNaira)
      : 0;
  }
  delete set.freeDeliveryThresholdNaira;
  const after = await Settings.findOneAndUpdate(
    { key: 'main' },
    { $set: set },
    { new: true }
  ).lean();
  await logFromRequest(req, {
    action: 'settings',
    entity: 'settings',
    entityId: 'main',
    before,
    after,
  });
  return after;
}

/** Admin and owner: homepage hero slides and the announcement bar. */
export async function updateMarketing(req, input) {
  const before = await getSettings();
  const after = await Settings.findOneAndUpdate(
    { key: 'main' },
    { $set: input },
    { new: true }
  ).lean();
  await logFromRequest(req, {
    action: 'marketing',
    entity: 'settings',
    entityId: 'main',
    before: { heroSlides: before.heroSlides, announcementBar: before.announcementBar },
    after: { heroSlides: after.heroSlides, announcementBar: after.announcementBar },
  });
  return after;
}

/* ----------------------------- Staff ----------------------------- */

export const listStaff = () =>
  User.find({ role: { $in: ['staff', 'admin', 'owner'] } })
    .select('name email role isActive lastLoginAt createdAt')
    .sort({ createdAt: 1 })
    .lean();

export async function inviteStaff(req, { name, email, role }) {
  if (await User.exists({ email: email.toLowerCase() }))
    throw new HttpError(409, 'That email already has an account');
  const temp = crypto.randomBytes(9).toString('base64url');
  const user = await User.create({ name, email, role, passwordHash: await hashPassword(temp) });
  try {
    await sendMail({
      to: user.email,
      subject: 'You have been invited to Novelle Tech admin',
      text: `Hi ${name}, you now have ${role} access to the Novelle Tech admin at ${env.CLIENT_URL}/admin/login. Temporary password: ${temp}. Please change it after you log in.`,
      html: `<p>Hi ${name},</p><p>You now have <strong>${role}</strong> access to the Novelle Tech admin.</p><p>Temporary password: <code>${temp}</code></p><p>Please log in and change it.</p>`,
    });
  } catch (err) {
    logger.error('Invite email failed', err);
  }
  await logFromRequest(req, {
    action: 'invite',
    entity: 'staff',
    entityId: user._id,
    after: { email: user.email, role },
  });
  return {
    id: user._id,
    email: user.email,
    role,
    temporaryPassword: temp,
  };
}

export async function updateStaff(req, id, input) {
  const target = await User.findById(id);
  if (!target || !['staff', 'admin', 'owner'].includes(target.role))
    throw new HttpError(404, 'Staff member not found');
  if (
    String(target._id) === String(req.user._id) &&
    ((input.role !== undefined && input.role !== 'owner') || input.isActive === false)
  ) {
    throw new HttpError(400, 'You cannot demote or disable your own account');
  }
  const before = { role: target.role, isActive: target.isActive };
  if (input.role !== undefined) target.role = input.role;
  if (input.isActive !== undefined) target.isActive = input.isActive;
  await target.save();
  await logFromRequest(req, {
    action: 'staff',
    entity: 'staff',
    entityId: id,
    before,
    after: { role: target.role, isActive: target.isActive },
  });
  return { id, role: target.role, isActive: target.isActive };
}

/* ----------------------------- Activity and subscribers ----------------------------- */

export async function listActivity({ entity, entityId, actor, from, to, page, limit }) {
  const match = {};
  if (entity) match.entity = entity;
  if (entityId) match.entityId = entityId;
  if (actor) match.actorEmail = actor.toLowerCase();
  if (from || to) {
    match.at = {};
    if (from) match.at.$gte = new Date(from);
    if (to) match.at.$lte = new Date(new Date(to).getTime() + DAY - 1);
  }
  const [items, total] = await Promise.all([
    ActivityLog.find(match)
      .sort({ at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(match),
  ]);
  return { items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listSubscribers({ format }) {
  const rows = await Subscriber.find().sort({ createdAt: -1 }).lean();
  if (format === 'csv') {
    return {
      csv: [
        'Email,Source,Subscribed',
        ...rows.map((r) => `${r.email},${r.source},${new Date(r.createdAt).toISOString()}`),
      ].join('\n'),
    };
  }
  return { items: rows, total: rows.length };
}

/* ----------------------------- Catalogue setup ----------------------------- */

const CATALOGUE = { category: Category, brand: Brand };

export const listCatalogue = (kind) => CATALOGUE[kind].find().sort({ name: 1 }).lean();

export async function createCatalogue(req, kind, input) {
  const slug = input.slug || slugify(input.name);
  const doc = await CATALOGUE[kind].create({ ...input, slug });
  await logFromRequest(req, {
    action: 'create',
    entity: kind,
    entityId: doc._id,
    after: snapshot(doc),
  });
  return doc;
}

export async function updateCatalogue(req, kind, id, input) {
  const doc = await CATALOGUE[kind].findById(id);
  if (!doc) throw new HttpError(404, 'Not found');
  const before = snapshot(doc);
  Object.assign(doc, input);
  if (input.name && !input.slug) doc.slug = slugify(input.name);
  await doc.save();
  await logFromRequest(req, {
    action: 'update',
    entity: kind,
    entityId: id,
    before,
    after: snapshot(doc),
  });
  return doc;
}

export async function deleteCatalogue(req, kind, id) {
  const field = kind === 'category' ? 'category' : 'brand';
  const used = await Product.exists({ [field]: id });
  const doc = await CATALOGUE[kind].findById(id);
  if (!doc) throw new HttpError(404, 'Not found');
  if (used) {
    doc.isActive = false;
    await doc.save();
    await logFromRequest(req, {
      action: 'deactivate',
      entity: kind,
      entityId: id,
      after: { isActive: false },
    });
    return { deactivated: true };
  }
  await CATALOGUE[kind].deleteOne({ _id: id });
  await logFromRequest(req, {
    action: 'delete',
    entity: kind,
    entityId: id,
    before: snapshot(doc),
  });
  return { deleted: true };
}
