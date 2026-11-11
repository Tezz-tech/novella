import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { Product, Settings, Coupon } from '../src/models/index.js';
import { seedDatabase } from '../seed/seed.js';

const app = createApp();
let mongod;

/** Finds a product and one of its variants by option values (Storage / Colour). */
async function variantOf(slug, match = {}) {
  const p = await Product.findOne({ slug }).lean();
  const v =
    p.variants.find((vr) =>
      Object.entries(match).every(([k, val]) => vr.optionValues?.[k] === val)
    ) ?? p.variants[0];
  return { productId: String(p._id), variantId: String(v._id), price: v.price, stock: v.stock };
}

const quote = (body) => request(app).post('/api/cart/quote').send(body);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seedDatabase();
}, 180_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('POST /api/cart/quote: server-side pricing', () => {
  it('ignores any price or total the browser sends', async () => {
    const v = await variantOf('anker-20w-charger');
    const res = await quote({
      items: [
        { productId: v.productId, variantId: v.variantId, qty: 1, unitPrice: 1, lineTotal: 1 },
      ],
      state: 'Lagos',
      total: 1,
      subtotal: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.lines[0].unitPrice).toBe(v.price);
    expect(res.body.data.subtotal).toBe(v.price);
    expect(res.body.data.total).toBe(v.price + 200_000); // + Lagos delivery
  });

  it('merges duplicate lines and caps quantity at 99', async () => {
    const v = await variantOf('anker-usbc-cable');
    const res = await quote({
      items: [
        { productId: v.productId, variantId: v.variantId, qty: 60 },
        { productId: v.productId, variantId: v.variantId, qty: 60 },
      ],
      method: 'pickup',
    });
    expect(res.body.data.lines).toHaveLength(1);
    expect(res.body.data.lines[0].qty).toBe(99);
  });

  it('flags out-of-stock lines and leaves them out of the subtotal', async () => {
    const out = await variantOf('iphone-14', { Storage: '256GB', Colour: 'Midnight' });
    const ok = await variantOf('anker-20w-charger');
    const res = await quote({
      items: [
        { productId: out.productId, variantId: out.variantId, qty: 1 },
        { productId: ok.productId, variantId: ok.variantId, qty: 1 },
      ],
      method: 'pickup',
    });
    const outLine = res.body.data.lines.find((l) => l.variantId === out.variantId);
    expect(outLine.available).toBe(false);
    expect(outLine.warning).toBe('Out of stock');
    expect(res.body.data.hasIssues).toBe(true);
    expect(res.body.data.subtotal).toBe(ok.price);
  });

  it('says how many are left when asked for more than the stock', async () => {
    const v = await variantOf('iphone-15', { Storage: '128GB', Colour: 'Pink' });
    const res = await quote({
      items: [{ productId: v.productId, variantId: v.variantId, qty: v.stock + 3 }],
      method: 'pickup',
    });
    expect(res.body.data.lines[0].available).toBe(false);
    expect(res.body.data.lines[0].warning).toMatch(/Only 5 left/);
  });

  it('charges the zone fee for a state and the free-delivery threshold above it', async () => {
    const cheap = await variantOf('anker-20w-charger'); // ₦18,500: below the ₦50,000 threshold
    const lagos = await quote({
      items: [{ productId: cheap.productId, variantId: cheap.variantId, qty: 1 }],
      state: 'Lagos',
    });
    expect(lagos.body.data.deliveryFee).toBe(200_000);
    expect(lagos.body.data.delivery.zone.state).toBe('Lagos');

    const fct = await quote({
      items: [{ productId: cheap.productId, variantId: cheap.variantId, qty: 1 }],
      state: 'FCT',
    });
    expect(fct.body.data.deliveryFee).toBe(250_000);

    const big = await variantOf('iphone-15', { Storage: '128GB', Colour: 'Black' }); // above threshold
    const free = await quote({
      items: [{ productId: big.productId, variantId: big.variantId, qty: 1 }],
      state: 'Lagos',
    });
    expect(free.body.data.deliveryFee).toBe(0);
    expect(free.body.data.delivery.freeDelivery).toBe(true);
  });

  it('charges nothing for pickup', async () => {
    const v = await variantOf('anker-20w-charger');
    const res = await quote({
      items: [{ productId: v.productId, variantId: v.variantId, qty: 1 }],
      method: 'pickup',
      state: 'Lagos',
    });
    expect(res.body.data.deliveryFee).toBe(0);
  });

  it('asks for an address when no state is given, and refuses unserved states', async () => {
    const v = await variantOf('anker-20w-charger');
    const noState = await quote({
      items: [{ productId: v.productId, variantId: v.variantId, qty: 1 }],
    });
    expect(noState.body.data.delivery.needsAddress).toBe(true);

    const unknown = await quote({
      items: [{ productId: v.productId, variantId: v.variantId, qty: 1 }],
      state: 'Narnia',
    });
    expect(unknown.status).toBe(400);
    expect(unknown.body.message).toMatch(/do not deliver/);
  });

  it('applies a coupon only when coupons are switched on', async () => {
    const v = await variantOf('anker-20w-charger');
    await Coupon.create({ code: 'TEN', type: 'percent', value: 10, isActive: true });
    const body = {
      items: [{ productId: v.productId, variantId: v.variantId, qty: 2 }],
      method: 'pickup',
      coupon: 'ten',
    };

    await Settings.updateOne(
      { key: 'main' },
      { $set: { 'features.coupons': false } },
      { upsert: true }
    );
    const off = await quote(body);
    expect(off.body.data.discount).toBe(0);
    expect(off.body.data.coupon.valid).toBe(false);

    await Settings.updateOne({ key: 'main' }, { $set: { 'features.coupons': true } });
    const on = await quote(body);
    expect(on.body.data.coupon.valid).toBe(true);
    expect(on.body.data.discount).toBe(Math.floor((v.price * 2 * 10) / 100));
    expect(on.body.data.total).toBe(v.price * 2 - on.body.data.discount);
  });

  it('rejects an empty or malformed cart', async () => {
    expect((await quote({ items: [], method: 'pickup' })).status).toBe(400);
    expect(
      (await quote({ items: [{ productId: 'nope', variantId: 'nope', qty: 1 }] })).status
    ).toBe(400);
  });
});
