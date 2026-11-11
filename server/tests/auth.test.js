import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { User, Product } from '../src/models/index.js';
import { requireAuth, requireRole } from '../src/middleware/auth.js';
import { requestPasswordReset } from '../src/services/auth.service.js';
import { seedDatabase } from '../seed/seed.js';
import { hashPassword } from '../src/utils/password.js';

const app = createApp();
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seedDatabase();
}, 180_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const newCustomer = (overrides = {}) => ({
  name: 'Amaka Okafor',
  email: `amaka+${Math.random().toString(36).slice(2, 8)}@example.com`,
  password: 'Pretty-pass1',
  phone: '08012345678',
  ...overrides,
});

const cookieOf = (res) =>
  (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('nvt_session='));

describe('register and login', () => {
  it('registers, sets an httpOnly session cookie, and never returns the password hash', async () => {
    const body = newCustomer();
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(body.email.toLowerCase());
    expect(res.body.data.role).toBe('customer');
    expect(res.body.data).not.toHaveProperty('passwordHash');

    const cookie = cookieOf(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('refuses a duplicate email with a helpful message', async () => {
    const body = newCustomer();
    await request(app).post('/api/auth/register').send(body);
    const again = await request(app)
      .post('/api/auth/register')
      .send({ ...body, email: body.email.toUpperCase() });
    expect(again.status).toBe(409);
    expect(again.body.message).toMatch(/already exists/);
  });

  it('validates password strength and fields with a 400 and a field list', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(newCustomer({ password: 'short' }));
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.path === 'password')).toBe(true);
  });

  it('gives the same generic error for a wrong password and an unknown email', async () => {
    const body = newCustomer();
    await request(app).post('/api/auth/register').send(body);
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: body.email, password: 'Wrong-pass9' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Wrong-pass9' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('logs in and then reads /me with the cookie; logout clears it', async () => {
    const body = newCustomer();
    await request(app).post('/api/auth/register').send(body);
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .send({ email: body.email, password: body.password });
    expect(login.status).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(body.email.toLowerCase());

    await agent.post('/api/auth/logout');
    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });

  it('rejects /me without a cookie and with a forged cookie', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const forged = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'nvt_session=not.a.real.token');
    expect(forged.status).toBe(401);
  });
});

describe('password reset', () => {
  it('answers the same way for known and unknown emails', async () => {
    const body = newCustomer();
    await request(app).post('/api/auth/register').send(body);
    const known = await request(app).post('/api/auth/forgot-password').send({ email: body.email });
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost@example.com' });
    expect(known.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
  });

  it('stores only a hash of the token, accepts it once, and then the new password works', async () => {
    const body = newCustomer();
    await request(app).post('/api/auth/register').send(body);

    const raw = await requestPasswordReset(body.email);
    const stored = await User.findOne({ email: body.email.toLowerCase() }).select(
      '+resetTokenHash'
    );
    expect(stored.resetTokenHash).toBeTruthy();
    expect(stored.resetTokenHash).not.toBe(raw);

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, password: 'Brand-new1' });
    expect(reset.status).toBe(200);

    const reused = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, password: 'Another-1x' });
    expect(reused.status).toBe(400);

    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: body.email, password: 'Brand-new1' })
      ).status
    ).toBe(200);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: body.email, password: body.password })
      ).status
    ).toBe(401);
  });

  it('rejects an expired reset token', async () => {
    const body = newCustomer();
    await request(app).post('/api/auth/register').send(body);
    const raw = await requestPasswordReset(body.email);
    await User.updateOne(
      { email: body.email.toLowerCase() },
      { $set: { resetTokenExpiresAt: new Date(Date.now() - 1000) } }
    );
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, password: 'Brand-new1' });
    expect(res.status).toBe(400);
  });
});

describe('account: profile, addresses and wishlist', () => {
  let agent;
  let customer;

  beforeAll(async () => {
    customer = newCustomer();
    agent = request.agent(app);
    await agent.post('/api/auth/register').send(customer);
  });

  const address = (overrides = {}) => ({
    fullName: 'Amaka Okafor',
    phone: '08000000000',
    line1: '12 Admiralty Way',
    city: 'Lekki',
    state: 'Lagos',
    ...overrides,
  });

  it('is locked behind login', async () => {
    expect((await request(app).get('/api/me/profile')).status).toBe(401);
  });

  it('updates the profile', async () => {
    const res = await agent.put('/api/me/profile').send({ name: 'Amaka O.', phone: '08111111111' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Amaka O.');
  });

  it('keeps exactly one default address as addresses are added and changed', async () => {
    const first = await agent.post('/api/me/addresses').send(address({ label: 'Home' }));
    expect(first.body.data).toHaveLength(1);
    expect(first.body.data[0].isDefault).toBe(true);

    const second = await agent
      .post('/api/me/addresses')
      .send(address({ label: 'Office', isDefault: true }));
    const defaults = second.body.data.filter((a) => a.isDefault);
    expect(second.body.data).toHaveLength(2);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].label).toBe('Office');

    const idToDelete = second.body.data.find((a) => !a.isDefault)._id;
    const removed = await agent.delete(`/api/me/addresses/${idToDelete}`);
    expect(removed.body.data).toHaveLength(1);
    expect(removed.body.data[0].isDefault).toBe(true);
  });

  it('will not let one customer edit another customer’s address', async () => {
    const other = request.agent(app);
    await other.post('/api/auth/register').send(newCustomer());
    const mine = await agent.get('/api/me/addresses');
    const res = await other
      .put(`/api/me/addresses/${mine.body.data[0]._id}`)
      .send(address({ label: 'Hacked' }));
    expect(res.status).toBe(404);
  });

  it('merges a guest wishlist: saves only active products and returns no prices', async () => {
    const p = await Product.findOne({ slug: 'galaxy-a15' }).lean();
    const draft = await Product.create({
      name: 'Hidden draft',
      slug: 'hidden-draft',
      brand: p.brand,
      category: p.category,
      status: 'draft',
      variants: [{ price: 1000, stock: 1 }],
    });

    const res = await agent
      .put('/api/me/wishlist')
      .send({ productIds: [String(p._id), String(draft._id)] });
    expect(res.status).toBe(200);
    expect(res.body.data.map((i) => i.slug)).toEqual(['galaxy-a15']);
    expect(res.body.data[0]).not.toHaveProperty('priceMin');

    const bad = await agent.put('/api/me/wishlist').send({ productIds: ['not-an-id'] });
    expect(bad.status).toBe(400);
  });

  it('lists the customer’s own orders (none yet) and hides other people’s', async () => {
    const res = await agent.get('/api/me/orders');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    const missing = await agent.get('/api/me/orders/NVT-2611-00001');
    expect(missing.status).toBe(404);
  });
});

describe('role guard', () => {
  it('lets only the listed roles through', async () => {
    const guard = express();
    guard.use(express.json());
    guard.use(cookieParser());
    guard.get('/admin-only', requireAuth, requireRole('admin', 'owner'), (_req, res) =>
      res.json({ ok: true })
    );

    const pw = await hashPassword('Admin-pass1');
    await User.create({
      name: 'Staff Admin',
      email: 'admin.guard@example.com',
      passwordHash: pw,
      role: 'admin',
    });
    await User.create({
      name: 'Plain Customer',
      email: 'customer.guard@example.com',
      passwordHash: pw,
      role: 'customer',
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.guard@example.com', password: 'Admin-pass1' });
    const adminCookie = cookieOf(adminLogin).split(';')[0];
    const allowed = await request(guard).get('/admin-only').set('Cookie', adminCookie);
    expect(allowed.status).toBe(200);

    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer.guard@example.com', password: 'Admin-pass1' });
    const customerCookie = cookieOf(customerLogin).split(';')[0];
    const denied = await request(guard).get('/admin-only').set('Cookie', customerCookie);
    expect(denied.status).toBe(403);
  });
});
