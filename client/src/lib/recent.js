import { safeStorage } from './storage.js';

const KEY = 'novelle-recent';
const MAX = 8;

/** Recently viewed products, stored only as display fields (never prices the server should decide). */
export function readRecent() {
  try {
    const parsed = JSON.parse(safeStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberProduct(p) {
  try {
    const next = [
      { slug: p.slug, name: p.name, image: p.coverImage?.url ?? null, priceMin: p.priceMin },
      ...readRecent().filter((r) => r.slug !== p.slug),
    ].slice(0, MAX);
    safeStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: skip silently */
  }
}
