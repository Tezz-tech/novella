import { ApiError } from '../lib/api.js';

const BASE = '/api';

/** Uploads one product photo (JPG, PNG or WebP, up to 5 MB). Returns { url, publicId }. */
export async function uploadAdminImage(file) {
  const form = new FormData();
  form.append('file', file);
  let res;
  try {
    res = await fetch(`${BASE}/admin/uploads/image`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Upload failed: check your connection and try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false)
    throw new ApiError(res.status, json.message || 'Upload failed');
  return json.data;
}

/** Cartesian product of option values, e.g. Storage × Colour. Keeps existing rows where the values match. */
export function buildVariantGrid(options, existing = [], defaults = {}) {
  const usable = options.filter((o) => o.name && o.values?.length);
  if (!usable.length) {
    const keep =
      existing.find((v) => Object.keys(v.optionValues ?? {}).length === 0) ?? existing[0];
    return [
      {
        ...(keep ?? {}),
        optionValues: {},
        price: keep?.price ?? defaults.price ?? 0,
        compareAtPrice: keep?.compareAtPrice ?? '',
        stock: keep?.stock ?? 0,
      },
    ];
  }
  let combos = [{}];
  for (const opt of usable) {
    combos = combos.flatMap((c) => opt.values.map((val) => ({ ...c, [opt.name]: val })));
  }
  const keyOf = (ov) =>
    JSON.stringify(
      Object.keys(ov)
        .sort()
        .map((k) => [k, ov[k]])
    );
  const byKey = new Map(existing.map((v) => [keyOf(v.optionValues ?? {}), v]));
  return combos.map((ov) => {
    const old = byKey.get(keyOf(ov));
    return old
      ? { ...old, optionValues: ov }
      : {
          optionValues: ov,
          price: defaults.price ?? 0,
          compareAtPrice: '',
          stock: 0,
          sku: '',
          isActive: true,
        };
  });
}
