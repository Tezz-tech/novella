/** Display formatting only. Money arrives from the API in kobo and is never calculated here. */
const CURRENCY = import.meta.env.VITE_CURRENCY || 'NGN';

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

/** 102000000 kobo -> "₦1,020,000" */
export const formatPrice = (kobo) => naira.format((kobo ?? 0) / 100);

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

export const CONDITION_LABELS = {
  brand_new: 'Brand New',
  uk_used: 'UK Used',
  refurbished: 'Refurbished',
  open_box: 'Open Box',
};

export const STATUS_LABELS = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};
