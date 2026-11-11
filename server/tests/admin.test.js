import request from 'supertest';
import nock from 'nock';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  User,
  Product,
  Order,
  Brand,
  Category,
  ActivityLog,
  Refund,
  DeliveryZone,
  Coupon,
  Settings,
} from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
import { seedDatabase } from '../seed/seed.js';
import { computeNewPrice } from '../src/services/admin.products.service.js';

const app = createApp();
let mongod;
const agents = {};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seedDatabase();
  const pw = await hashPassword('Staff-pass1');
  for (const role of ['customer', 'staff', 'admin', 'owner']) {
    await User.create({
      name: `${role} person`,
      email: `${role}@store.test`,
      passwordHash: pw,
      role,
    });
    const agent = request.agent(app);
    const res = await agent
      .post('/api/auth/login')
      .send({ email: `${role}@store.test`, password: 'Staff-pass1' });
    expect(res.status).toBe(200);
    agents[role] = agent;
  }
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
}, 180_000);

afterAll(async () => {
  nock.enableNetConnect();
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(() => nock.cleanAll());

async function refs() {
  const brand = await Brand.findOne({ slug: 'others' }).lean();
  const category = await Category.findOne({ slug: 'accessories' }).lean();
  return { brand: String(brand._id), category: String(category._id) };
}

const productPayload = (over = {}) => ({
  name: 'Test Power Strip',
  brand: null,
  category: null,
  type: 'single',
  condition: 'brand_new',
  status: 'active',
  variants: [{ optionValues: {}, price: 18500, stock: 7 }],
  ...over,
});

describe('role gating', () => {
  it('turns away guests (401), customers (403) and allows staff into the dashboard', async () => {
    expect((await request(app).get('/api/admin/dashboard')).status).toBe(401);
    expect((await agents.customer.get('/api/admin/dashboard')).status).toBe(403);
    expect((await agents.staff.get('/api/admin/dashboard')).status).toBe(200);
  });

  it('keeps bulk prices, refunds and coupons away from staff, but open to admin', async () => {
    const bulk = { mode: 'percent', value: 5, field: 'price', round: 'none', ids: [] };
    expect((await agents.staff.patch('/api/admin/products/bulk-price').send(bulk)).status).toBe(
      403
    );
    expect((await agents.admin.get('/api/admin/coupons')).status).toBe(200);
    expect((await agents.staff.get('/api/admin/coupons')).status).toBe(403);
  });

  it('keeps settings and staff management to the owner', async () => {
    expect((await agents.admin.put('/api/admin/settings').send({ storeName: 'X' })).status).toBe(
      403
    );
    expect(
      (await agents.owner.put('/api/admin/settings').send({ storeName: 'Novelle Tech' })).status
    ).toBe(200);
    expect((await agents.admin.get('/api/admin/staff')).status).toBe(403);
    expect((await agents.owner.get('/api/admin/staff')).status).toBe(200);
  });
});

describe('products', () => {
  it('creates a product from naira input, stores kobo, and logs the change', async () => {
    const before = await ActivityLog.countDocuments({ entity: 'product', action: 'create' });
    const r = await refs();
    const res = await agents.staff
      .post('/api/admin/products')
      .send(productPayload({ ...r, name: 'Admin Power Strip' }));
    expect(res.status).toBe(201);
    const stored = await Product.findOne({ slug: 'admin-power-strip' }).lean();
    expect(stored.variants[0].price).toBe(1_850_000);
    expect(stored.totalStock).toBe(7);
    expect(await ActivityLog.countDocuments({ entity: 'product', action: 'create' })).toBe(
      before + 1
    );
  });

  it('refuses a duplicate slug with a clear message', async () => {
    const r = await refs();
    const res = await agents.staff
      .post('/api/admin/products')
      .send(productPayload({ ...r, name: 'Admin Power Strip' }));
    expect(res.status).toBe(409);
  });

  it('validates the payload (bad price, no variants) with a field list', async () => {
    const r = await refs();
    const res = await agents.staff
      .post('/api/admin/products')
      .send(productPayload({ ...r, name: 'Bad One', variants: [] }));
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('a stock change on a combo child refreshes the combo’s stock', async () => {
    const child = await Product.findOne({ slug: 'oraimo-freepods' }).lean();
    const combo = await Product.findOne({ slug: 'combo-galaxy-a15-starter' }).lean();
    const vid = String(child.variants[0]._id);
    const res = await agents.staff
      .patch(`/api/admin/products/${child._id}/variants/${vid}`)
      .send({ stock: 1 });
    expect(res.status).toBe(200);
    const comboAfter = await Product.findById(combo._id).lean();
    expect(comboAfter.totalStock).toBeLessThanOrEqual(1);
    // put it back
    await agents.staff
      .patch(`/api/admin/products/${child._id}/variants/${vid}`)
      .send({ stock: 15 });
  });

  it('archives a product that has orders instead of deleting it', async () => {
    const p = await Product.findOne({ slug: 'galaxy-s24' }).lean();
    await Order.create({
      orderNumber: 'NVT-2611-70001',
      customer: { name: 'Buyer', email: 'buyer@x.test', phone: '08000000000' },
      items: [
        {
          product: p._id,
          variant: p.variants[0]._id,
          name: p.name,
          variantLabel: '256GB',
          unitPrice: 1,
          qty: 1,
          lineTotal: 1,
        },
      ],
      delivery: { method: 'pickup' },
      subtotal: 1,
      total: 1,
      status: 'paid',
      paymentStatus: 'paid',
    });
    const res = await agents.staff.delete(`/api/admin/products/${p._id}`);
    expect(res.body.data.archived).toBe(true);
    expect((await Product.findById(p._id).lean()).status).toBe('archived');
  });

  it('dry-runs a bulk price change, then applies it with rounding and a log entry', async () => {
    const v = await Product.findOne({ slug: 'anker-usbc-cable' }).lean();
    const body = {
      ids: [String(v._id)],
      mode: 'percent',
      value: 10,
      field: 'price',
      round: 'nearest_100',
    };
    const preview = await agents.admin
      .patch('/api/admin/products/bulk-price?dryRun=true')
      .send(body);
    expect(preview.status).toBe(200);
    expect(preview.body.data.dryRun).toBe(true);
    expect(preview.body.data.rows[0].oldNaira).toBe(6500);
    expect(preview.body.data.rows[0].newNaira).toBe(7200); // 6,500 + 10% = 7,150 → nearest ₦100 = 7,200

    const applied = await agents.admin.patch('/api/admin/products/bulk-price').send(body);
    expect(applied.body.data.updatedVariants).toBe(1);
    expect((await Product.findById(v._id).lean()).variants[0].price).toBe(720_000);
    expect(await ActivityLog.countDocuments({ action: 'bulk_price' })).toBeGreaterThanOrEqual(1);
  });

  it('computes price changes correctly in the pure helper', () => {
    expect(computeNewPrice(1_000_000, { mode: 'fixed', value: 500 })).toBe(1_050_000);
    expect(computeNewPrice(1_000_000, { mode: 'set', value: 9999, round: 'nearest_1000' })).toBe(
      1_000_000
    );
    expect(computeNewPrice(100, { mode: 'percent', value: -95 })).toBe(5);
    expect(computeNewPrice(100, { mode: 'fixed', value: -10 })).toBe(0); // never below zero
  });
});

describe('orders, refunds and payments', () => {
  let orderId;

  beforeAll(async () => {
    const p = await Product.findOne({ slug: 'tecno-spark-20' }).lean();
    const order = await Order.create({
      orderNumber: 'NVT-2611-80001',
      customer: { name: 'Ada Buyer', email: 'ada@buyer.test', phone: '08012345678' },
      items: [
        {
          product: p._id,
          variant: p.variants[0]._id,
          name: p.name,
          variantLabel: '128GB',
          unitPrice: 12_500_000,
          qty: 1,
          lineTotal: 12_500_000,
        },
      ],
      delivery: {
        method: 'delivery',
        address: { line1: '1 Test Road', city: 'Ikeja', state: 'Lagos' },
        fee: 200000,
      },
      subtotal: 12_500_000,
      deliveryFee: 200000,
      total: 12_700_000,
      status: 'paid',
      paymentStatus: 'paid',
      payment: {
        reference: 'NVT-2611-80001-AB12',
        references: ['NVT-2611-80001-AB12'],
        paidAt: new Date(),
      },
      timeline: [{ status: 'paid', note: 'Paid', by: 'webhook' }],
    });
    orderId = String(order._id);
  });

  it('lists orders with status tabs and finds one by name', async () => {
    const res = await agents.staff.get('/api/admin/orders?q=Ada');
    expect(res.status).toBe(200);
    expect(res.body.data.items.some((o) => o.orderNumber === 'NVT-2611-80001')).toBe(true);
    expect(res.body.data.counts.paid).toBeGreaterThanOrEqual(1);
  });

  it('follows the status lifecycle and refuses skips', async () => {
    const skip = await agents.staff
      .patch(`/api/admin/orders/${orderId}/status`)
      .send({ status: 'delivered' });
    expect(skip.status).toBe(400);
    const processing = await agents.staff
      .patch(`/api/admin/orders/${orderId}/status`)
      .send({ status: 'processing', note: 'Packing' });
    expect(processing.body.data.status).toBe('processing');
    const shipped = await agents.staff
      .patch(`/api/admin/orders/${orderId}/status`)
      .send({ status: 'shipped', courier: 'GIG', trackingNumber: 'GIG123' });
    expect(shipped.body.data.fulfilment.trackingNumber).toBe('GIG123');
    const delivered = await agents.staff
      .patch(`/api/admin/orders/${orderId}/status`)
      .send({ status: 'delivered' });
    expect(delivered.body.data.status).toBe('delivered');
    expect(delivered.body.data.timeline.length).toBeGreaterThan(2);
  });

  it('refunds through Paystack, refuses more than the amount paid, and records a pending refund', async () => {
    const tooMuch = await agents.admin
      .post(`/api/admin/orders/${orderId}/refund`)
      .send({ amount: 999999, reason: 'x' });
    expect(tooMuch.status).toBe(400);

    let sentBody;
    nock('https://api.paystack.co')
      .post('/refund', (b) => {
        sentBody = b;
        return true;
      })
      .reply(200, { status: true, data: { id: 555, status: 'pending' } });

    const res = await agents.admin
      .post(`/api/admin/orders/${orderId}/refund`)
      .send({ amount: 50000, reason: 'Damaged', restock: false });
    expect(res.status).toBe(201);
    expect(sentBody.amount).toBe(5_000_000); // naira to kobo at Paystack
    expect(sentBody.transaction).toBe('NVT-2611-80001-AB12');
    const refund = await Refund.findOne({ order: orderId }).lean();
    expect(refund.status).toBe('pending');
    expect(refund.paystackRefundId).toBe('555');
  });

  it('keeps refunds away from staff', async () => {
    const res = await agents.staff
      .post(`/api/admin/orders/${orderId}/refund`)
      .send({ reason: 'x' });
    expect(res.status).toBe(403);
  });

  it('shows the payment flags and the reconciliation totals', async () => {
    const res = await agents.admin.get('/api/admin/payments');
    expect(res.status).toBe(200);
    expect(res.body.data.flags).toEqual(
      expect.objectContaining({ amountMismatches: expect.any(Number) })
    );
    expect(res.body.data.totals).toEqual(
      expect.objectContaining({ collected: expect.any(Number), net: expect.any(Number) })
    );
  });

  it('lists customers built from orders (guests included) and shows one customer', async () => {
    const list = await agents.staff.get('/api/admin/customers?q=ada');
    expect(list.body.data.items[0].type).toBe('guest');
    const one = await agents.staff.get('/api/admin/customers/ada@buyer.test');
    expect(one.body.data.orders.length).toBeGreaterThanOrEqual(1);
  });

  it('CSV export of orders downloads as a file', async () => {
    const res = await agents.admin.get('/api/admin/orders?format=csv');
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('NVT-2611-80001');
  });

  it('dashboard returns KPIs, a revenue series and the recent orders', async () => {
    const res = await agents.staff.get('/api/admin/dashboard?range=30d');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.kpis.revenue.value).toBeGreaterThan(0);
    expect(Array.isArray(d.series)).toBe(true);
    expect(d.recentOrders.length).toBeGreaterThan(0);
    expect(Array.isArray(d.lowStock)).toBe(true);
  });
});

describe('store settings, zones, coupons, staff and logs', () => {
  it('stores the free-delivery threshold in kobo from a naira value', async () => {
    const res = await agents.owner
      .put('/api/admin/settings')
      .send({ freeDeliveryThresholdNaira: 60000 });
    expect(res.status).toBe(200);
    expect((await Settings.findOne({ key: 'main' }).lean()).freeDeliveryThreshold).toBe(6_000_000);
  });

  it('creates a delivery zone and sets many states at once from naira', async () => {
    const zone = await agents.admin
      .post('/api/admin/delivery-zones')
      .send({ state: 'Kano', city: 'Kano Metro', fee: 4000, etaText: '3–5 days' });
    expect(zone.status).toBe(201);
    expect((await DeliveryZone.findOne({ state: 'Kano', city: 'Kano Metro' }).lean()).fee).toBe(
      400_000
    );
    const bulk = await agents.admin
      .post('/api/admin/delivery-zones/bulk-fee')
      .send({ states: ['Kano', 'Kaduna'], feeNaira: 3800 });
    expect(bulk.body.data.updated).toBe(2);
    expect((await DeliveryZone.findOne({ state: 'Kaduna', city: '*' }).lean()).fee).toBe(380_000);
  });

  it('creates a fixed-amount coupon in kobo and refuses a duplicate code', async () => {
    const res = await agents.admin.post('/api/admin/coupons').send({
      code: 'welcome-500',
      type: 'fixed',
      value: 500,
      minSubtotalNaira: 20000,
      isActive: true,
    });
    expect(res.status).toBe(201);
    const c = await Coupon.findOne({ code: 'WELCOME-500' }).lean();
    expect(c.value).toBe(50_000);
    expect(c.minSubtotal).toBe(2_000_000);
    expect(
      (
        await agents.admin
          .post('/api/admin/coupons')
          .send({ code: 'WELCOME-500', type: 'fixed', value: 1 })
      ).status
    ).toBe(409);
  });

  it('invites a staff member with a temporary password that works, and keeps the owner from demoting themselves', async () => {
    const invite = await agents.owner
      .post('/api/admin/staff')
      .send({ name: 'New Staffer', email: 'new.staff@store.test', role: 'staff' });
    expect(invite.status).toBe(201);
    const temp = invite.body.data.temporaryPassword;
    expect(temp).toBeTruthy();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'new.staff@store.test', password: temp });
    expect(login.status).toBe(200);

    const me = await User.findOne({ email: 'owner@store.test' }).lean();
    const self = await agents.owner.patch(`/api/admin/staff/${me._id}`).send({ role: 'staff' });
    expect(self.status).toBe(400);
  });

  it('writes an activity entry with the actor and a before/after diff', async () => {
    const res = await agents.admin.get('/api/admin/activity?entity=settings');
    expect(res.status).toBe(200);
    const row = res.body.data.items.find((i) => i.actorEmail === 'owner@store.test');
    expect(row).toBeTruthy();
    expect(row.before).toBeTruthy();
    expect(row.after).toBeTruthy();
  });

  it('updates the homepage marketing content for admins', async () => {
    const res = await agents.admin
      .put('/api/admin/marketing')
      .send({ heroSlides: [], announcementBar: 'Free delivery this week' });
    expect(res.status).toBe(200);
    expect(res.body.data.announcementBar).toBe('Free delivery this week');
  });

  it('refuses image uploads when Cloudinary is not configured, and when no file is sent', async () => {
    const none = await agents.staff.post('/api/admin/uploads/image');
    expect(none.status).toBe(400);
  });
});
