import crypto from 'node:crypto';
import request from 'supertest';
import nock from 'nock';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { Order, Payment, Product } from '../src/models/index.js';
import { cancelStaleOrders } from '../src/services/checkout.service.js';
import { env } from '../src/config/env.js';
import { seedDatabase } from '../seed/seed.js';

const app = createApp();
const PAYSTACK = 'https://api.paystack.co';
let mongod;
let emailCounter = 0;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seedDatabase();
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
}, 180_000);

afterAll(async () => {
  nock.enableNetConnect();
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(() => nock.cleanAll());

const buyer = () => {
  emailCounter += 1;
  return { name: 'Test Buyer', email: `buyer${emailCounter}@example.com`, phone: '08012345678' };
};

async function variantOf(slug, match = {}) {
  const p = await Product.findOne({ slug }).lean();
  const v =
    p.variants.find((vr) =>
      Object.entries(match).every(([k, val]) => vr.optionValues?.[k] === val)
    ) ?? p.variants[0];
  return {
    productId: String(p._id),
    variantId: String(v._id),
    price: v.price,
    stock: v.stock,
    id: v._id,
  };
}

const stockOf = async (productId, variantId) => {
  const p = await Product.findById(productId).lean();
  return p.variants.find((v) => String(v._id) === String(variantId)).stock;
};

/** Mocks Paystack initialise and records the body it was sent. */
function mockInitialize(captured = []) {
  nock(PAYSTACK)
    .post('/transaction/initialize')
    .reply(200, (_uri, body) => {
      captured.push(body);
      return {
        status: true,
        data: {
          authorization_url: `https://checkout.paystack.com/${body.reference}`,
          access_code: `AC_${body.reference}`,
          reference: body.reference,
        },
      };
    });
  return captured;
}

/** Mocks Paystack verify for a reference. `overrides` change the transaction returned. */
function mockVerify(reference, overrides = {}) {
  nock(PAYSTACK)
    .get(`/transaction/verify/${reference}`)
    .reply(200, {
      status: true,
      data: {
        id: Math.floor(Math.random() * 1e9),
        status: 'success',
        reference,
        amount: overrides.amount,
        currency: 'NGN',
        channel: 'card',
        paid_at: new Date().toISOString(),
        fees: 150,
        gateway_response: 'Successful',
        customer: { customer_code: 'CUS_test' },
        authorization: { last4: '4081', card_type: 'visa' },
        ...overrides,
      },
    });
}

async function placeOrder({
  slug = 'anker-usbc-cable',
  qty = 1,
  method = 'pickup',
  variant = {},
  extra = {},
} = {}) {
  const v = await variantOf(slug, variant);
  const captured = mockInitialize();
  const body = {
    items: [{ productId: v.productId, variantId: v.variantId, qty }],
    customer: buyer(),
    method,
    ...(method === 'delivery'
      ? { address: { line1: '1 Test Road', city: 'Ikeja', state: 'Lagos' } }
      : {}),
    ...extra,
  };
  const res = await request(app).post('/api/orders').send(body);
  return { res, v, captured, body };
}

const signed = (event) => {
  const raw = JSON.stringify(event);
  const sig = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  return { raw, sig };
};

const sendWebhook = (event, sigOverride) => {
  const { raw, sig } = signed(event);
  return request(app)
    .post('/api/payments/paystack/webhook')
    .set('Content-Type', 'application/json')
    .set('x-paystack-signature', sigOverride ?? sig)
    .send(raw);
};

describe('POST /api/orders: server-side pricing and initialisation', () => {
  it('ignores client-sent prices: Paystack is charged the database total', async () => {
    const v = await variantOf('anker-usbc-cable');
    const captured = mockInitialize();
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [
          { productId: v.productId, variantId: v.variantId, qty: 2, unitPrice: 1, lineTotal: 1 },
        ],
        customer: buyer(),
        method: 'pickup',
        total: 1,
        amount: 1,
      });
    expect(res.status).toBe(201);
    expect(captured[0].amount).toBe(v.price * 2);
    expect(res.body.data.amount).toBe(v.price * 2);
    const order = await Order.findOne({ orderNumber: res.body.data.orderNumber }).lean();
    expect(order.total).toBe(v.price * 2);
    expect(order.status).toBe('pending_payment');
    expect(order.paymentStatus).toBe('unpaid');
  });

  it('adds the zone fee for delivery and records the reference and access code', async () => {
    const { res, v, captured } = await placeOrder({ method: 'delivery' });
    expect(res.status).toBe(201);
    expect(captured[0].amount).toBe(v.price + 200_000); // Lagos zone fee
    const order = await Order.findOne({ orderNumber: res.body.data.orderNumber }).lean();
    expect(order.payment.reference).toBe(res.body.data.reference);
    expect(order.payment.references).toContain(res.body.data.reference);
    expect(order.payment.accessCode).toBe(`AC_${res.body.data.reference}`);
  });

  it('does not take stock when the order is created (only on payment)', async () => {
    const { res, v } = await placeOrder({ slug: 'oraimo-powerbank-20k', qty: 2 });
    expect(res.status).toBe(201);
    expect(await stockOf(v.productId, v.variantId)).toBe(v.stock);
  });

  it('refuses an order with an out-of-stock line, and sends nothing to Paystack', async () => {
    const out = await variantOf('iphone-14', { Storage: '256GB', Colour: 'Midnight' });
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: out.productId, variantId: out.variantId, qty: 1 }],
        customer: buyer(),
        method: 'pickup',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/need attention/);
  });
});

describe('payment confirmation: verify and webhook', () => {
  it('signature: a correctly signed charge.success is accepted; a tampered body is refused', async () => {
    const { res } = await placeOrder();
    const ref = res.body.data.reference;
    mockVerify(ref, { amount: res.body.data.amount });

    const tampered = await sendWebhook(
      { event: 'charge.success', data: { reference: ref, id: 1 } },
      'deadbeef'
    );
    expect(tampered.status).toBe(401);
    const unpaid = await Order.findOne({ 'payment.references': ref }).lean();
    expect(unpaid.paymentStatus).toBe('unpaid');

    const ok = await sendWebhook({ event: 'charge.success', data: { reference: ref, id: 2 } });
    expect(ok.status).toBe(200);
    const paid = await Order.findOne({ 'payment.references': ref }).lean();
    expect(paid.paymentStatus).toBe('paid');
  });

  it('marks paid once and takes stock exactly once, however many times it is confirmed', async () => {
    const { res, v } = await placeOrder({ slug: 'anker-usbc-cable', qty: 3 });
    const ref = res.body.data.reference;
    const before = await stockOf(v.productId, v.variantId);
    mockVerify(ref, { amount: res.body.data.amount });

    const first = await request(app).get(`/api/payments/verify/${ref}`);
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('paid');
    expect(first.body.data.order.paymentStatus).toBe('paid');
    expect(first.body.data.order).not.toHaveProperty('customer'); // no personal details on the success page

    // Repeats: the webhook and a second verify must not deduct again.
    await request(app).get(`/api/payments/verify/${ref}`);
    await sendWebhook({ event: 'charge.success', data: { reference: ref, id: 99 } });
    await sendWebhook({ event: 'charge.success', data: { reference: ref, id: 99 } });

    expect(await stockOf(v.productId, v.variantId)).toBe(before - 3);
    const product = await Product.findById(v.productId).lean();
    expect(product.soldCount).toBeGreaterThanOrEqual(3);
    const payments = await Payment.countDocuments({ reference: ref, status: 'success' });
    expect(payments).toBeGreaterThanOrEqual(1);
  });

  it('rejects an amount mismatch: not fulfilled, flagged, stock untouched', async () => {
    const { res, v } = await placeOrder({ slug: 'anker-usbc-cable', qty: 1 });
    const ref = res.body.data.reference;
    const before = await stockOf(v.productId, v.variantId);
    mockVerify(ref, { amount: res.body.data.amount - 100 });

    const out = await request(app).get(`/api/payments/verify/${ref}`);
    expect(out.body.data.status).toBe('mismatch');
    const order = await Order.findOne({ 'payment.references': ref }).lean();
    expect(order.paymentStatus).toBe('failed');
    expect(order.status).toBe('pending_payment');
    expect(order.timeline.some((t) => /mismatch/i.test(t.note))).toBe(true);
    expect(await stockOf(v.productId, v.variantId)).toBe(before);
  });

  it('pays the order when stock ran out after checkout, flags it, and never goes below zero', async () => {
    const { res, v } = await placeOrder({ slug: 'anker-usbc-cable', qty: 2 });
    const ref = res.body.data.reference;
    await Product.updateOne(
      { _id: v.productId, 'variants._id': v.variantId },
      { $set: { 'variants.$.stock': 1 } }
    );
    await Product.updateOne({ _id: v.productId }, { $set: { totalStock: 1 } });
    mockVerify(ref, { amount: res.body.data.amount });

    const out = await request(app).get(`/api/payments/verify/${ref}`);
    expect(out.body.data.status).toBe('paid');
    const order = await Order.findOne({ 'payment.references': ref }).lean();
    expect(order.stockIssue).toBe(true);
    expect(await stockOf(v.productId, v.variantId)).toBe(1);
  });

  it('a combo sale takes stock from each child, not from the combo itself', async () => {
    const combo = await variantOf('combo-galaxy-a15-starter');
    const child = await variantOf('oraimo-freepods');
    const childBefore = await stockOf(child.productId, child.variantId);
    const { res } = await placeOrder({ slug: 'combo-galaxy-a15-starter', qty: 1 });
    const ref = res.body.data.reference;
    mockVerify(ref, { amount: res.body.data.amount });
    await request(app).get(`/api/payments/verify/${ref}`);
    expect(await stockOf(child.productId, child.variantId)).toBe(childBefore - 1);
    const comboDoc = await Product.findById(combo.productId).lean();
    expect(comboDoc.soldCount).toBeGreaterThanOrEqual(1);
  });

  it('answers unknown webhook events with 200 and ignores them', async () => {
    const res = await sendWebhook({ event: 'transfer.success', data: { id: 5 } });
    expect(res.status).toBe(200);
  });
});

describe('tracking, retry and stale orders', () => {
  it('tracks by order number and email, and shows no address', async () => {
    const { res, body } = await placeOrder({ method: 'delivery' });
    const ok = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: res.body.data.orderNumber, emailOrPhone: body.customer.email });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('pending_payment');
    expect(JSON.stringify(ok.body)).not.toContain('Test Road');

    const wrong = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: res.body.data.orderNumber, emailOrPhone: 'someone@else.com' });
    expect(wrong.status).toBe(404);
  });

  it('gives an unpaid order a new reference for a retry, checked against the email', async () => {
    const { res, body } = await placeOrder();
    const oldRef = res.body.data.reference;
    mockInitialize();
    const retry = await request(app)
      .post(`/api/orders/${res.body.data.orderNumber}/retry-payment`)
      .send({ email: body.customer.email });
    expect(retry.status).toBe(201);
    expect(retry.body.data.reference).not.toBe(oldRef);
    const order = await Order.findOne({ orderNumber: res.body.data.orderNumber }).lean();
    expect(order.payment.references).toEqual(
      expect.arrayContaining([oldRef, retry.body.data.reference])
    );

    const denied = await request(app)
      .post(`/api/orders/${res.body.data.orderNumber}/retry-payment`)
      .send({ email: 'not-the-buyer@example.com' });
    expect(denied.status).toBe(404);
  });

  it('cancels a stale unpaid order after Paystack confirms it is not paid', async () => {
    const { res } = await placeOrder();
    const ref = res.body.data.reference;
    await Order.updateOne(
      { 'payment.references': ref },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } }
    );
    nock(PAYSTACK)
      .get(`/transaction/verify/${ref}`)
      .reply(200, {
        status: true,
        data: {
          status: 'abandoned',
          reference: ref,
          amount: res.body.data.amount,
          currency: 'NGN',
        },
      });

    const cancelled = await cancelStaleOrders();
    expect(cancelled).toBeGreaterThanOrEqual(1);
    const order = await Order.findOne({ 'payment.references': ref }).lean();
    expect(order.status).toBe('cancelled');
  });
});
