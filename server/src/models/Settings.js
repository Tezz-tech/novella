import mongoose from 'mongoose';

const { Schema } = mongoose;

const faqSchema = new Schema(
  { question: { type: String, required: true }, answer: { type: String, required: true } },
  { _id: false }
);

const heroSlideSchema = new Schema(
  {
    image: { type: String, default: null },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    ctaLabel: { type: String, default: '' },
    ctaLink: { type: String, default: '' },
  },
  { _id: false }
);

// A single document holds the whole store configuration. `key` keeps it a singleton.
const settingsSchema = new Schema(
  {
    key: { type: String, default: 'main', unique: true },
    storeName: { type: String, default: 'Novelle Tech' },
    tagline: { type: String, default: 'Smart Deals. Pretty Prices. ✨' },
    logo: { type: String, default: null },
    contact: {
      phone: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      email: { type: String, default: '' },
      instagram: { type: String, default: '' },
      tiktok: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    pickupAddress: { type: String, default: '' },
    currency: { type: String, default: 'NGN' },
    freeDeliveryThreshold: { type: Number, default: 0, min: 0 }, // kobo, 0 = off
    lowStockDefault: { type: Number, default: 3, min: 0 },
    heroSlides: { type: [heroSlideSchema], default: [] },
    announcementBar: { type: String, default: '' },
    faq: { type: [faqSchema], default: [] },
    policies: {
      returns: { type: String, default: '' },
      privacy: { type: String, default: '' },
      terms: { type: String, default: '' },
    },
    features: {
      reviews: { type: Boolean, default: false },
      coupons: { type: Boolean, default: false },
      newsletter: { type: Boolean, default: true },
      notifyWhenBackInStock: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);
