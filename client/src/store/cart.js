import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../lib/storage.js';

/**
 * Cart lines are kept locally (persisted). Prices are NOT stored here: the server re-prices
 * the cart through POST /cart/quote every time it is shown or checked out.
 *
 * Line identity = variant id (combos use their own variant id too).
 */
/** Only these fields are ever stored: never prices. */
const pickLine = ({ variantId, productId, slug, name, image, label }) => ({
  variantId,
  productId,
  slug,
  name,
  image: image ?? null,
  label: label ?? '',
});

export const useCart = create(
  persist(
    (set, get) => ({
      items: [], // { variantId, productId, slug, name, image, label, qty }
      add: (line, qty = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.variantId === line.variantId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.variantId === line.variantId ? { ...i, qty: Math.min(i.qty + qty, 99) } : i
            ),
          });
        } else {
          set({ items: [...items, { ...pickLine(line), qty: Math.min(qty, 99) }] });
        }
      },
      setQty: (variantId, qty) =>
        set({
          items:
            qty <= 0
              ? get().items.filter((i) => i.variantId !== variantId)
              : get().items.map((i) =>
                  i.variantId === variantId ? { ...i, qty: Math.min(qty, 99) } : i
                ),
        }),
      remove: (variantId) => set({ items: get().items.filter((i) => i.variantId !== variantId) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'novelle-cart',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export const selectCartCount = (state) => state.items.reduce((n, i) => n + i.qty, 0);
