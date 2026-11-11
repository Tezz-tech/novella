/* Creates five clearly-marked dummy products for testing. Safe to run again (matched by slug). */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Brand, Category, Product } from '../src/models/index.js';
import { nairaToKobo } from '../src/utils/money.js';

const DUMMIES = [1, 2, 3, 4, 5].map((n) => ({
  name: `DUMMY Product ${n}`,
  slug: `dummy-product-${n}`,
  shortDescription: `Dummy test product ${n}. Delete it from the admin when you are done.`,
  priceNaira: 10000 * n,
  stock: 10,
}));

try {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const brand = await Brand.findOne({ slug: 'others' }).lean();
  const category = await Category.findOne({ slug: 'others' }).lean();
  if (!brand || !category)
    throw new Error('Run `npm run seed` first (brand and category are needed).');

  for (const d of DUMMIES) {
    // Load and save (not updateOne) so the model recalculates price and stock fields.
    const doc = (await Product.findOne({ slug: d.slug })) ?? new Product({ slug: d.slug });
    Object.assign(doc, {
      name: d.name,
      type: 'single',
      brand: brand._id,
      category: category._id,
      shortDescription: d.shortDescription,
      description: 'Dummy product for testing only.',
      condition: 'brand_new',
      status: 'active',
      tags: [],
      warranty: 'Dummy',
      variants: [
        {
          sku: `DUMMY-${d.slug.slice(-1)}`,
          optionValues: {},
          price: nairaToKobo(d.priceNaira),
          stock: d.stock,
          isActive: true,
        },
      ],
    });
    await doc.save();
  }
  console.log(`Dummy products ready: ${DUMMIES.map((d) => d.name).join(', ')}`);
} catch (err) {
  console.error('Dummy seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
