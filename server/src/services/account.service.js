import { User, Product, Order } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';

/** Profile, addresses, wishlist and order history for the signed-in customer. */

export async function updateProfile(userId, { name, phone }) {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, 'Account not found');
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();
  return user;
}

const normaliseAddress = (a) => ({
  label: a.label || 'Home',
  fullName: a.fullName,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2 ?? '',
  landmark: a.landmark ?? '',
  city: a.city,
  state: a.state,
});

/** Keeps exactly one default address, and makes the first saved address the default. */
function applyDefault(addresses, chosenId) {
  for (const a of addresses)
    a.isDefault = chosenId ? String(a._id) === String(chosenId) : a.isDefault;
  if (!addresses.some((a) => a.isDefault) && addresses.length) addresses[0].isDefault = true;
}

export async function addAddress(userId, input) {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, 'Account not found');
  if (user.addresses.length >= 10) throw new HttpError(400, 'You can save up to 10 addresses');
  user.addresses.push({ ...normaliseAddress(input), isDefault: false });
  const added = user.addresses[user.addresses.length - 1];
  applyDefault(user.addresses, input.isDefault ? added._id : null);
  await user.save();
  return user.addresses;
}

export async function updateAddress(userId, addressId, input) {
  const user = await User.findById(userId);
  const address = user?.addresses.id(addressId);
  if (!address) throw new HttpError(404, 'Address not found');
  Object.assign(address, normaliseAddress({ ...address.toObject(), ...input }));
  applyDefault(user.addresses, input.isDefault ? address._id : null);
  await user.save();
  return user.addresses;
}

export async function deleteAddress(userId, addressId) {
  const user = await User.findById(userId);
  const address = user?.addresses.id(addressId);
  if (!address) throw new HttpError(404, 'Address not found');
  address.deleteOne();
  applyDefault(user.addresses);
  await user.save();
  return user.addresses;
}

/** Wishlist entries for display: names and images only. Prices are never stored or sent from here. */
export async function getWishlist(userId) {
  const user = await User.findById(userId).select('wishlist').lean();
  const products = await Product.find({ _id: { $in: user?.wishlist ?? [] }, status: 'active' })
    .select('name slug images')
    .lean();
  return products.map((p) => ({
    productId: String(p._id),
    slug: p.slug,
    name: p.name,
    image: p.images?.[0]?.url ?? null,
  }));
}

/**
 * Replaces the wishlist with the given product ids, keeping only active products. Used both for
 * normal saves and for merging a guest wishlist into the account after login.
 */
export async function setWishlist(userId, productIds) {
  const unique = [...new Set(productIds)];
  const valid = await Product.find({ _id: { $in: unique }, status: 'active' })
    .select('_id')
    .lean();
  await User.updateOne({ _id: userId }, { $set: { wishlist: valid.map((p) => p._id) } });
  return getWishlist(userId);
}

/** Orders placed by this customer, newest first. Full detail is in getOrderForUser. */
export async function listOrders(userId) {
  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .select('orderNumber status paymentStatus total currency createdAt items.name items.qty')
    .lean();
  return orders.map((o) => ({
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: o.total,
    currency: o.currency,
    createdAt: o.createdAt,
    itemCount: o.items.reduce((n, i) => n + i.qty, 0),
    firstItem: o.items[0]?.name ?? '',
  }));
}

/** One order, only if it belongs to this customer. Other customers get a 404, not a 403. */
export async function getOrderForUser(userId, orderNumber) {
  const order = await Order.findOne({ orderNumber, user: userId }).lean();
  if (!order) throw new HttpError(404, 'Order not found');
  return order;
}
