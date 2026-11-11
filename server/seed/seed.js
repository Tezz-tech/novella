import { Brand, Category, DeliveryZone, Product, Settings, User } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
import { nairaToKobo } from '../src/utils/money.js';
import { categories, brands, deliveryZones, settings, products, combos } from './data.js';

const PLACEHOLDER_IMAGE = '/placeholders/product.svg';
const DEFAULT_STOCK = 5;

/** Builds the variant grid from the demo definition. Money is converted to kobo here. */
function buildVariants(p) {
  const rows = [];
  const add = (optionValues, price, compare, stock) =>
    rows.push({
      optionValues,
      price: nairaToKobo(price),
      compareAtPrice: compare ? nairaToKobo(compare) : null,
      stock: stock ?? DEFAULT_STOCK,
    });

  if (p.storage) {
    for (const [label, price, compare, stock] of p.storage) {
      const base = { Storage: label };
      if (p.colours)
        p.colours.forEach((colour) => add({ ...base, Colour: colour }, price, compare, stock));
      else add(base, price, compare, stock);
    }
  } else if (p.colours) {
    p.colours.forEach((colour) => add({ Colour: colour }, p.price, p.compare, p.stock));
  } else {
    add({}, p.price, p.compare, p.stock);
  }

  return rows.map((v, i) => ({
    ...v,
    sku: `${p.slug}-${i + 1}`.toUpperCase(),
    lowStockThreshold: 3,
    isActive: true,
  }));
}

function buildOptions(p) {
  const options = [];
  if (p.storage) options.push({ name: 'Storage', values: p.storage.map((s) => s[0]) });
  if (p.colours) options.push({ name: 'Colour', values: p.colours });
  return options;
}

function productDoc(p, brandId, categoryId) {
  const images = [{ url: PLACEHOLDER_IMAGE, publicId: null, alt: p.name }];
  const doc = {
    name: p.name,
    slug: p.slug,
    type: p.type ?? 'single',
    brand: brandId,
    category: categoryId,
    shortDescription: p.shortDescription,
    description: p.description,
    specs: (p.specs ?? []).map(([label, value]) => ({ label, value })),
    images,
    condition: p.condition,
    warranty: '6 months store warranty',
    tags: p.tags ?? [],
    status: 'active',
    options: buildOptions(p),
    seo: { title: `${p.name} | Novelle Tech`, description: p.shortDescription },
    dealEndsAt: p.dealEndsInDays ? new Date(Date.now() + p.dealEndsInDays * 86_400_000) : null,
  };
  return doc;
}

/** Upserts by slug. Uses save() so pre-validate derives price and stock fields. */
async function upsertProduct(doc, variants, comboItems = []) {
  const product = (await Product.findOne({ slug: doc.slug })) ?? new Product();
  Object.assign(product, doc, { variants, comboItems });
  await product.save();
  return product;
}

/**
 * Seeds the database. Safe to run again: records are matched by slug or key and updated in place.
 * The owner account is only created if it does not exist, so an existing password is never reset.
 */
export async function seedDatabase({ ownerEmail, ownerPassword, ownerName = 'Store Owner' } = {}) {
  const counts = {};

  for (const c of categories) {
    await Category.updateOne({ slug: c.slug }, { $set: c }, { upsert: true });
  }
  counts.categories = categories.length;

  for (const b of brands) {
    await Brand.updateOne({ slug: b.slug }, { $set: b }, { upsert: true });
  }
  counts.brands = brands.length;

  for (const z of deliveryZones) {
    const fee = nairaToKobo(z.fee);
    await DeliveryZone.updateOne(
      { state: z.state, city: z.city },
      { $set: { ...z, fee } },
      { upsert: true }
    );
  }
  counts.deliveryZones = deliveryZones.length;

  await Settings.updateOne(
    { key: 'main' },
    {
      $set: {
        ...settings,
        freeDeliveryThreshold: nairaToKobo(settings.freeDeliveryThreshold),
        key: 'main',
      },
    },
    { upsert: true }
  );

  if (ownerEmail && ownerPassword) {
    const exists = await User.exists({ email: ownerEmail.toLowerCase() });
    if (!exists) {
      await User.create({
        name: ownerName,
        email: ownerEmail,
        passwordHash: await hashPassword(ownerPassword),
        role: 'owner',
      });
      counts.owner = 'created';
    } else {
      counts.owner = 'exists';
    }
  } else {
    counts.owner = 'skipped (no SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)';
  }

  const [brandDocs, categoryDocs] = await Promise.all([
    Brand.find().lean(),
    Category.find().lean(),
  ]);
  const brandId = (slug) => brandDocs.find((b) => b.slug === slug)?._id;
  const categoryId = (slug) => categoryDocs.find((c) => c.slug === slug)?._id;

  const savedBySlug = new Map();
  for (const p of products) {
    const saved = await upsertProduct(
      productDoc(p, brandId(p.brand), categoryId(p.category)),
      buildVariants(p)
    );
    savedBySlug.set(p.slug, saved);
  }
  counts.products = products.length;

  // Combos reference child variants, so they are built after their children exist.
  for (const c of combos) {
    const comboItems = c.items.map((item) => {
      const child = savedBySlug.get(item.slug);
      if (!child) throw new Error(`Combo ${c.slug} references unknown product ${item.slug}`);
      const variant = item.storage
        ? child.variants.find((v) => v.optionValues.get('Storage') === item.storage)
        : child.variants[0];
      if (!variant)
        throw new Error(`Combo ${c.slug}: no variant for ${item.slug} ${item.storage ?? ''}`);
      return { product: child._id, variant: variant._id, qty: item.qty ?? 1 };
    });

    const bundle = await upsertProduct(
      { ...productDoc(c, brandId(c.brand), categoryId(c.category)), type: 'combo' },
      [
        {
          optionValues: {},
          price: nairaToKobo(c.bundlePrice),
          stock: 0,
          sku: c.slug.toUpperCase(),
          isActive: true,
        },
      ],
      comboItems
    );

    // Combo stock is whatever the children can supply as complete bundles.
    const bundles = comboItems.map((ci) => {
      const child = [...savedBySlug.values()].find((p) => p._id.equals(ci.product));
      const v = child.variants.id(ci.variant);
      return Math.floor(v.stock / ci.qty);
    });
    bundle.totalStock = Math.min(...bundles);
    bundle.variants[0].stock = bundle.totalStock;
    await bundle.save();
  }
  counts.combos = combos.length;

  return counts;
}
