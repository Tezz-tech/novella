import { describe, expect, it } from 'vitest';
import { formatPrice, CONDITION_LABELS } from './format.js';

describe('formatPrice', () => {
  it('turns kobo into a naira display string', () => {
    expect(formatPrice(102000000)).toMatch(/1,020,000/);
    expect(formatPrice(0)).toMatch(/0/);
  });

  it('labels every condition the API can send', () => {
    expect(Object.keys(CONDITION_LABELS).sort()).toEqual([
      'brand_new',
      'open_box',
      'refurbished',
      'uk_used',
    ]);
  });
});
