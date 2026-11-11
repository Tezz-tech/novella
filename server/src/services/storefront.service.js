import { Category, Brand, DeliveryZone, Settings } from '../models/index.js';

/** Store info for the public site. The Settings document is created with defaults on first read. */
export async function getPublicSettings() {
  const s = await Settings.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    storeName: s.storeName,
    tagline: s.tagline,
    logo: s.logo,
    contact: s.contact,
    pickupAddress: s.pickupAddress,
    currency: s.currency,
    freeDeliveryThreshold: s.freeDeliveryThreshold,
    announcementBar: s.announcementBar,
    heroSlides: s.heroSlides,
    faq: s.faq,
    policies: s.policies,
    features: s.features,
  };
}

export const listCategories = () =>
  Category.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .select('name slug description image parent sortOrder')
    .lean();

export const listBrands = () =>
  Brand.find({ isActive: true }).sort({ name: 1 }).select('name slug logo').lean();

/** Active delivery zones for the checkout dropdown. Fees are kobo. */
export const listDeliveryZones = () =>
  DeliveryZone.find({ isActive: true })
    .sort({ state: 1, city: 1 })
    .select('state city fee etaText')
    .lean();
