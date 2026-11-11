import { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../lib/api.js';
import { useWishlist } from '../../store/wishlist.js';

/**
 * Keeps the guest wishlist and the account wishlist in step.
 * On login: merge local items into the account, then take the merged list.
 * After that: each local change is saved to the account (debounced).
 */
export default function WishlistSync() {
  const { user } = useAuth();
  const mergedFor = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!user) {
      mergedFor.current = null;
      return undefined;
    }
    if (mergedFor.current === user.id) return undefined;
    mergedFor.current = user.id;

    let cancelled = false;
    (async () => {
      try {
        const serverItems = await api('/me/wishlist');
        const local = useWishlist.getState().items;
        const ids = [...new Set([...serverItems, ...local].map((i) => i.productId))];
        const merged = await api('/me/wishlist', { method: 'PUT', body: { productIds: ids } });
        if (!cancelled) useWishlist.getState().replaceAll(merged);
      } catch {
        /* offline or signed out mid-way: the local list still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    const unsubscribe = useWishlist.subscribe((state, prev) => {
      if (state.items === prev.items) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const productIds = useWishlist.getState().items.map((i) => i.productId);
        api('/me/wishlist', { method: 'PUT', body: { productIds } }).catch(() => {});
      }, 600);
    });
    return () => {
      clearTimeout(timer.current);
      unsubscribe();
    };
  }, [user]);

  return null;
}
