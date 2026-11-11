import { Product } from '../models/index.js';

/**
 * Stock changes. Every decrement is a single conditional update (CLAUDE.md non-negotiable 3):
 * it succeeds only if the variant still has enough stock, so stock can never go below zero.
 */

/** Returns true when `qty` units were taken from the variant. */
export async function decrementVariant(productId, variantId, qty) {
  const res = await Product.updateOne(
    {
      _id: productId,
      variants: { $elemMatch: { _id: variantId, stock: { $gte: qty } } },
    },
    {
      $inc: {
        'variants.$.stock': -qty,
        totalStock: -qty,
      },
    }
  );
  return res.modifiedCount === 1;
}

/** Puts units back (used by refunds with restock, and by admin corrections in Phase 6). */
export async function restockVariant(productId, variantId, qty) {
  const res = await Product.updateOne(
    { _id: productId, 'variants._id': variantId },
    { $inc: { 'variants.$.stock': qty, totalStock: qty } }
  );
  return res.modifiedCount === 1;
}

/**
 * A combo can sell only as many complete bundles as its children allow. Recalculated from the
 * children after any child stock change.
 */
export async function refreshComboStock(comboId) {
  const combo = await Product.findById(comboId).lean();
  if (!combo || combo.type !== 'combo') return;

  let bundles = Infinity;
  for (const item of combo.comboItems ?? []) {
    const child = await Product.findById(item.product).select('variants').lean();
    const variant = child?.variants.find((v) => String(v._id) === String(item.variant));
    bundles = Math.min(bundles, variant ? Math.floor(variant.stock / item.qty) : 0);
  }
  const stock = Number.isFinite(bundles) ? bundles : 0;
  await Product.updateOne(
    { _id: comboId },
    { $set: { totalStock: stock, 'variants.0.stock': stock } }
  );
}

/** Refreshes every combo that includes this product. Call after any change to a child's stock. */
export async function refreshCombosContaining(productId) {
  const combos = await Product.find({ type: 'combo', 'comboItems.product': productId })
    .select('_id')
    .lean();
  for (const c of combos) await refreshComboStock(c._id);
}
