import { describe, expect, it } from 'vitest';
import { discountPercent } from './ProductCard.jsx';
import { PRICE_RANGES } from '../shop/Filters.jsx';

describe('discountPercent', () => {
  it('uses the largest discount across variants', () => {
    const product = {
      variants: [
        { price: 90000, compareAtPrice: 100000 }, // 10%
        { price: 70000, compareAtPrice: 100000 }, // 30%
        { price: 50000, compareAtPrice: null },
      ],
    };
    expect(discountPercent(product)).toBe(30);
  });

  it('is zero when no variant has a higher compare-at price', () => {
    expect(discountPercent({ variants: [{ price: 1000, compareAtPrice: 900 }] })).toBe(0);
    expect(discountPercent({ variants: [] })).toBe(0);
  });
});

describe('price range presets', () => {
  it('express bounds in kobo, matching the API', () => {
    const under100k = PRICE_RANGES.find((r) => r.id === 'under-100k');
    expect(under100k.max).toBe(10_000_000); // ₦100,000 in kobo
    const over600k = PRICE_RANGES.find((r) => r.id === 'over-600k');
    expect(over600k.min).toBe(60_000_000);
  });
});
