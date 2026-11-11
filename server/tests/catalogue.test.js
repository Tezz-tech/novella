import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { Brand, Category, Product } from '../src/models/index.js';
import { seedDatabase } from '../seed/seed.js';

const app = createApp();
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seedDatabase();

  // A draft product must never appear on the storefront.
  const brand = await Brand.findOne({ slug: 'others' });
  const category = await Category.findOne({ slug: 'others' });
  await Product.create({
    name: 'Secret Draft Gadget',
    slug: 'secret-draft-gadget',
    brand: brand._id,
    category: category._id,
    status: 'draft',
    variants: [{ price: 100000, stock: 10 }],
  });
}, 180_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const list = async (query = '') => {
  const res = await request(app).get(`/api/products${query ? `?${query}` : ''}`);
  return res;
};

describe('GET /api/products: listing and filters', () => {
  it('returns a paginated envelope with facets', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { items, total, page, pages, facets } = res.body.data;
    expect(page).toBe(1);
    expect(total).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(24);
    expect(pages).toBe(Math.ceil(total / 24));
    expect(facets).toEqual(
      expect.objectContaining({
        brands: expect.any(Array),
        categories: expect.any(Array),
        conditions: expect.any(Array),
        storage: expect.any(Array),
        priceRange: expect.objectContaining({ min: expect.any(Number), max: expect.any(Number) }),
      })
    );
  });

  it('never returns draft products', async () => {
    const res = await list('q=secret');
    expect(res.body.data.total).toBe(0);
    const all = await list('limit=50');
    const slugs = all.body.data.items.map((p) => p.slug);
    expect(slugs).not.toContain('secret-draft-gadget');
  });

  it('filters by category', async () => {
    const res = await list('category=phones&limit=50');
    const { items, total } = res.body.data;
    expect(total).toBeGreaterThan(5);
    expect(items.every((p) => p.category.slug === 'phones')).toBe(true);
  });

  it('filters by brand', async () => {
    const res = await list('brand=samsung&limit=50');
    const { items } = res.body.data;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.brand.slug === 'samsung')).toBe(true);
  });

  it('filters by condition, including several at once', async () => {
    const res = await list('condition=uk_used,refurbished&limit=50');
    const { items } = res.body.data;
    expect(items.map((p) => p.slug)).toEqual(
      expect.arrayContaining(['iphone-13-uk-used', 'pixel-8a'])
    );
    expect(items.every((p) => ['uk_used', 'refurbished'].includes(p.condition))).toBe(true);
  });

  it('filters by price range in kobo (a product matches when its lowest price is inside)', async () => {
    const min = 10_000_000; // ₦100,000
    const max = 20_000_000; // ₦200,000
    const res = await list(`minPrice=${min}&maxPrice=${max}&limit=50`);
    const { items } = res.body.data;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.priceMin >= min && p.priceMin <= max)).toBe(true);
  });

  it('filters to in-stock products only', async () => {
    const all = await list('limit=50');
    const res = await list('inStock=true&limit=50');
    const { items, total } = res.body.data;
    expect(total).toBeLessThanOrEqual(all.body.data.total);
    expect(items.every((p) => p.totalStock > 0 && p.inStock)).toBe(true);
  });

  it('filters by storage option', async () => {
    const res = await list('storage=512GB&limit=50');
    const { items } = res.body.data;
    expect(items.map((p) => p.slug)).toEqual(['galaxy-s24']);
  });

  it('sorts by price ascending and descending', async () => {
    const asc = (await list('sort=price_asc&limit=50')).body.data.items.map((p) => p.priceMin);
    const desc = (await list('sort=price_desc&limit=50')).body.data.items.map((p) => p.priceMin);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('searches names and brand names', async () => {
    const byName = await list('q=galaxy&limit=50');
    expect(byName.body.data.items.length).toBeGreaterThan(0);
    expect(
      byName.body.data.items.every((p) => /galaxy/i.test(p.name) || p.slug.includes('galaxy'))
    ).toBe(true);

    const byBrand = await list('q=tecno&limit=50');
    expect(byBrand.body.data.items.length).toBeGreaterThan(0);
    expect(byBrand.body.data.items.every((p) => p.brand.slug === 'tecno')).toBe(true);
  });

  it('returns no items for an unknown category rather than an error', async () => {
    const res = await list('category=does-not-exist');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.items).toEqual([]);
  });

  it('paginates without overlap', async () => {
    const p1 = (await list('limit=5&page=1')).body.data.items.map((p) => p.slug);
    const p2 = (await list('limit=5&page=2')).body.data.items.map((p) => p.slug);
    expect(p1).toHaveLength(5);
    expect(p2).toHaveLength(5);
    expect(p1.filter((s) => p2.includes(s))).toEqual([]);
  });

  it('returns only combos for type=combo, four of them', async () => {
    const res = await list('type=combo&limit=50');
    expect(res.body.data.items).toHaveLength(4);
    expect(res.body.data.items.every((p) => p.type === 'combo')).toBe(true);
  });

  it('computes facet counts that add up to the total', async () => {
    const { total, facets } = (await list('limit=1')).body.data;
    expect(facets.brands.reduce((n, b) => n + b.count, 0)).toBe(total);
    expect(facets.conditions.reduce((n, c) => n + c.count, 0)).toBe(total);
    expect(facets.storage.map((s) => s.value)).toEqual(expect.arrayContaining(['128GB', '256GB']));
  });

  it('rejects bad query input with a 400 and a field list', async () => {
    const badSort = await list('sort=random');
    expect(badSort.status).toBe(400);
    expect(badSort.body.success).toBe(false);

    const inverted = await list('minPrice=500&maxPrice=100');
    expect(inverted.status).toBe(400);

    const tooBig = await list('limit=500');
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.errors.length).toBeGreaterThan(0);
  });

  it('keeps every money value an integer in kobo', async () => {
    const { items } = (await list('limit=50')).body.data;
    for (const p of items) {
      expect(Number.isInteger(p.priceMin)).toBe(true);
      for (const v of p.variants) {
        expect(Number.isInteger(v.price)).toBe(true);
      }
    }
  });
});

describe('GET /api/products/:slug: detail', () => {
  it('returns a product with variants priced in kobo and related items', async () => {
    const res = await request(app).get('/api/products/iphone-15');
    expect(res.status).toBe(200);
    const { product, related, combo } = res.body.data;
    expect(product.slug).toBe('iphone-15');
    expect(
      product.variants.find(
        (v) => v.optionValues.Storage === '128GB' && v.optionValues.Colour === 'Pink'
      ).price
    ).toBe(102_000_000);
    expect(related.length).toBeGreaterThan(0);
    expect(related.some((p) => p.slug === 'iphone-15')).toBe(false);
    expect(combo).toBeNull();
  });

  it('404s for unknown or draft slugs', async () => {
    expect((await request(app).get('/api/products/nope-nope')).status).toBe(404);
    expect((await request(app).get('/api/products/secret-draft-gadget')).status).toBe(404);
  });

  it('shows what a combo includes, what it costs separately and the saving', async () => {
    const res = await request(app).get('/api/products/combo-galaxy-a15-starter');
    expect(res.status).toBe(200);
    const { combo, product } = res.body.data;
    expect(product.type).toBe('combo');
    expect(combo.included).toHaveLength(3);
    expect(combo.bundlePrice).toBe(20_500_000);
    expect(combo.separatelyTotal).toBeGreaterThan(combo.bundlePrice);
    expect(combo.saving).toBe(combo.separatelyTotal - combo.bundlePrice);
    expect(combo.available).toBe(true);
  });

  it('never gives a combo more stock than its children can supply', async () => {
    const combo = await Product.findOne({ slug: 'combo-infinix-hot-40' });
    const child = await Product.findOne({ slug: 'infinix-hot-40' });
    expect(combo.totalStock).toBeLessThanOrEqual(child.totalStock);
  });
});

describe('suggest, catalogue and storefront routes', () => {
  it('suggests at most six products for a query', async () => {
    const res = await request(app).get('/api/products/search/suggest?q=iph');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.length).toBeLessThanOrEqual(6);
    expect(res.body.data.some((p) => p.slug.startsWith('iphone'))).toBe(true);
  });

  it('requires a query for suggest', async () => {
    expect((await request(app).get('/api/products/search/suggest')).status).toBe(400);
  });

  it('lists categories and brands', async () => {
    const cats = await request(app).get('/api/categories');
    expect(cats.body.data.map((c) => c.slug)).toEqual(
      expect.arrayContaining(['phones', 'laptops', 'combos', 'others'])
    );
    const brands = await request(app).get('/api/brands');
    expect(brands.body.data.map((b) => b.slug)).toEqual(
      expect.arrayContaining(['apple', 'samsung', 'others'])
    );
  });

  it('lists all 36 states plus FCT as delivery zones, with Lagos cheapest', async () => {
    const res = await request(app).get('/api/delivery-zones');
    const zones = res.body.data;
    expect(zones).toHaveLength(37);
    const states = new Set(zones.map((z) => z.state));
    expect(states.has('FCT')).toBe(true);
    expect(states.has('Lagos')).toBe(true);
    const lagos = zones.find((z) => z.state === 'Lagos').fee;
    expect(zones.every((z) => z.fee >= lagos)).toBe(true);
  });

  it('returns public settings with the free-delivery threshold in kobo', async () => {
    const res = await request(app).get('/api/settings/public');
    expect(res.body.data.storeName).toBe('Novelle Tech');
    expect(res.body.data.freeDeliveryThreshold).toBe(5_000_000);
    expect(res.body.data).not.toHaveProperty('_id');
  });
});

describe('seeding', () => {
  it('is safe to run again without duplicating records', async () => {
    const before = await Product.countDocuments();
    await seedDatabase();
    expect(await Product.countDocuments()).toBe(before);
  });

  it('creates the owner from env values once, with a bcrypt hash and no plain password', async () => {
    const { User } = await import('../src/models/index.js');
    const { verifyPassword } = await import('../src/utils/password.js');
    await seedDatabase({ ownerEmail: 'Owner@Example.com', ownerPassword: 'a-strong-test-pass' });
    const owner = await User.findOne({ email: 'owner@example.com' }).select('+passwordHash');
    expect(owner.role).toBe('owner');
    expect(owner.passwordHash).not.toContain('a-strong-test-pass');
    expect(owner.passwordHash.startsWith('$2')).toBe(true);
    expect(await verifyPassword('a-strong-test-pass', owner.passwordHash)).toBe(true);

    // Running again must not reset the password.
    await seedDatabase({ ownerEmail: 'owner@example.com', ownerPassword: 'different-pass-123' });
    const again = await User.findOne({ email: 'owner@example.com' }).select('+passwordHash');
    expect(again.passwordHash).toBe(owner.passwordHash);
    expect(await User.countDocuments({ email: 'owner@example.com' })).toBe(1);
  });

  it('seeds 28 single products and 4 combos', async () => {
    const singles = await Product.countDocuments({
      type: 'single',
      slug: { $ne: 'secret-draft-gadget' },
    });
    const combos = await Product.countDocuments({ type: 'combo' });
    expect(singles).toBe(28);
    expect(combos).toBe(4);
  });
});
