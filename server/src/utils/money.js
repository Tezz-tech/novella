/**
 * Money rules (CLAUDE.md): stored and transmitted as integers in the minor unit (kobo for NGN).
 * Convert from naira only at an input boundary (for example the seed script or an admin form),
 * and format only for display.
 */

/** ₦1,234.50 -> 123450 kobo. Rejects values that cannot be exact kobo. */
export function nairaToKobo(naira) {
  const n = Number(naira);
  if (!Number.isFinite(n) || n < 0) throw new RangeError(`Invalid naira amount: ${naira}`);
  return Math.round(n * 100);
}

/** 123450 kobo -> "₦1,234.50". For display and emails, never for calculations. */
export function formatNaira(kobo, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(kobo / 100);
}
