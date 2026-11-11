import { useQuery } from '@tanstack/react-query';
import { api } from './api.js';

/** Shared TanStack Query hooks. Keys are kept in one place so invalidation stays predictable. */
export const keys = {
  settings: ['settings'],
  categories: ['categories'],
  brands: ['brands'],
  zones: ['delivery-zones'],
  products: (params) => ['products', params],
  product: (slug) => ['product', slug],
  suggest: (q) => ['suggest', q],
  quote: (lines, extra) => ['cart-quote', lines, extra],
};

export const useSettings = () =>
  useQuery({
    queryKey: keys.settings,
    queryFn: () => api('/settings/public'),
    staleTime: 10 * 60_000,
  });

export const useCategories = () =>
  useQuery({
    queryKey: keys.categories,
    queryFn: () => api('/categories'),
    staleTime: 10 * 60_000,
  });

export const useBrands = () =>
  useQuery({ queryKey: keys.brands, queryFn: () => api('/brands'), staleTime: 10 * 60_000 });

export const useProducts = (params, options = {}) =>
  useQuery({
    queryKey: keys.products(params),
    queryFn: ({ signal }) => api('/products', { query: params, signal }),
    placeholderData: (prev) => prev,
    ...options,
  });

export const useProduct = (slug) =>
  useQuery({
    queryKey: keys.product(slug),
    queryFn: ({ signal }) => api(`/products/${encodeURIComponent(slug)}`, { signal }),
    enabled: Boolean(slug),
  });

export const useSuggest = (q) =>
  useQuery({
    queryKey: keys.suggest(q),
    queryFn: ({ signal }) => api('/products/search/suggest', { query: { q }, signal }),
    enabled: q.length >= 2,
    staleTime: 60_000,
  });

export const useDeliveryZones = () =>
  useQuery({ queryKey: keys.zones, queryFn: () => api('/delivery-zones'), staleTime: 60 * 60_000 });
