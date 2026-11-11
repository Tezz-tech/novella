import { describe, expect, it } from 'vitest';
import { buildVariantGrid } from './upload.js';

describe('buildVariantGrid', () => {
  it('builds every combination of the option values', () => {
    const rows = buildVariantGrid([
      { name: 'Storage', values: ['128GB', '256GB'] },
      { name: 'Colour', values: ['Pink', 'Black'] },
    ]);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => `${r.optionValues.Storage}/${r.optionValues.Colour}`)).toEqual([
      '128GB/Pink',
      '128GB/Black',
      '256GB/Pink',
      '256GB/Black',
    ]);
  });

  it('keeps the prices, stock and ids of rows that already exist', () => {
    const existing = [
      { _id: 'abc', optionValues: { Storage: '128GB' }, price: 900000, stock: 4, sku: 'S128' },
    ];
    const rows = buildVariantGrid([{ name: 'Storage', values: ['128GB', '256GB'] }], existing, {
      price: 1,
    });
    const kept = rows.find((r) => r.optionValues.Storage === '128GB');
    expect(kept._id).toBe('abc');
    expect(kept.price).toBe(900000);
    expect(kept.stock).toBe(4);
    const added = rows.find((r) => r.optionValues.Storage === '256GB');
    expect(added.price).toBe(1);
    expect(added._id).toBeUndefined();
  });

  it('falls back to one standard row when there are no options', () => {
    const rows = buildVariantGrid([], [], { price: 5000 });
    expect(rows).toEqual([expect.objectContaining({ optionValues: {}, price: 5000 })]);
  });
});
