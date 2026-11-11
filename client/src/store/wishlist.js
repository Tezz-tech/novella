import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../lib/storage.js';

/** Guest wishlist, persisted in localStorage. Synced to the account after login (Phase 4). */
export const useWishlist = create(
  persist(
    (set, get) => ({
      items: [], // { productId, slug, name, image, priceMin }
      has: (productId) => get().items.some((i) => i.productId === productId),
      toggle: (item) => {
        const exists = get().has(item.productId);
        set({
          items: exists
            ? get().items.filter((i) => i.productId !== item.productId)
            : [...get().items, item],
        });
      },
      remove: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),
      replaceAll: (items) => set({ items }),
    }),
    {
      name: 'novelle-wishlist',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
