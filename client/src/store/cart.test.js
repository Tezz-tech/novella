import { beforeEach, describe, expect, it } from 'vitest';
import { useCart, selectCartCount } from './cart.js';

const line = {
  variantId: 'v1',
  productId: 'p1',
  slug: 'iphone-15',
  name: 'iPhone 15',
  image: null,
  label: '128GB',
};

describe('cart store', () => {
  beforeEach(() => useCart.getState().clear());

  it('adds a line once and merges quantities for the same variant', () => {
    useCart.getState().add(line);
    useCart.getState().add(line, 2);
    const { items } = useCart.getState();
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(3);
    expect(selectCartCount(useCart.getState())).toBe(3);
  });

  it('removes a line when its quantity drops to zero', () => {
    useCart.getState().add(line);
    useCart.getState().setQty('v1', 0);
    expect(useCart.getState().items).toHaveLength(0);
  });

  it('caps a single line at 99', () => {
    useCart.getState().add(line, 500);
    expect(useCart.getState().items[0].qty).toBe(99);
  });

  it('stores no prices (the server prices the cart)', () => {
    useCart.getState().add({ ...line, unitPrice: 1 });
    const stored = useCart.getState().items[0];
    expect(stored).not.toHaveProperty('unitPrice');
  });
});
