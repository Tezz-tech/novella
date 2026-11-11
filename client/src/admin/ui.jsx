import { useState } from 'react';
import { Modal } from '../components/ui/Overlay.jsx';
import Button from '../components/ui/Button.jsx';
import { ORDER_STATUS_LABELS } from './labels.js';

/** Calmer card for the admin: smaller radius, less glow than the storefront. */
export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-ink-700 bg-ink-900 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-ink-700 px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-rose-50">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl text-rose-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-rose-50/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONE = {
  neutral: 'border-ink-700 text-rose-50/75',
  pink: 'border-rose-400/50 text-rose-200',
  success: 'border-success/50 text-success',
  warn: 'border-spark-400/50 text-spark-400',
  danger: 'border-danger/50 text-danger',
};

export function Tag({ tone = 'neutral', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2 py-0.5 text-[11px] font-medium ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

const ORDER_TONE = {
  pending_payment: 'warn',
  paid: 'pink',
  processing: 'pink',
  shipped: 'neutral',
  delivered: 'success',
  cancelled: 'danger',
  refunded: 'danger',
};

export const OrderStatusTag = ({ status }) => (
  <Tag tone={ORDER_TONE[status] ?? 'neutral'}>{ORDER_STATUS_LABELS[status] ?? status}</Tag>
);

const PAY_TONE = {
  paid: 'success',
  unpaid: 'warn',
  failed: 'danger',
  refunded: 'danger',
  partially_refunded: 'warn',
};
export const PaymentTag = ({ status }) => (
  <Tag tone={PAY_TONE[status] ?? 'neutral'}>{status?.replace(/_/g, ' ')}</Tag>
);

export function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-3 text-sm">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span className="tabular-nums text-rose-50/70">
        Page {page} of {pages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}

export function Empty({ children = 'Nothing here yet.' }) {
  return <p className="py-10 text-center text-sm text-rose-50/55">{children}</p>;
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 text-xs text-rose-50/70 ${className}`}>
      <span className="font-medium uppercase tracking-label text-rose-200/80">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'h-10 w-full rounded-xl border border-ink-700 bg-ink-800 px-3 text-sm text-rose-50 placeholder:text-rose-50/35 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30';

/** Confirm dialog for anything destructive or outward-facing (CLAUDE.md: confirm first). */
export function useConfirm() {
  const [state, setState] = useState(null);
  const ask = (message, onYes, { danger = true, yes = 'Confirm' } = {}) =>
    setState({ message, onYes, danger, yes });
  const dialog = (
    <Modal open={Boolean(state)} onClose={() => setState(null)} label="Please confirm">
      <div className="space-y-5 p-6">
        <p className="text-rose-50">{state?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setState(null)}>
            Cancel
          </Button>
          <Button
            variant={state?.danger ? 'danger' : 'primary'}
            onClick={() => {
              const fn = state.onYes;
              setState(null);
              fn();
            }}
          >
            {state?.yes}
          </Button>
        </div>
      </div>
    </Modal>
  );
  return { ask, dialog };
}

export const naira = (kobo) =>
  kobo == null ? '—' : `₦${Math.round(kobo / 100).toLocaleString('en-NG')}`;
export const nairaInput = (kobo) => (kobo == null ? '' : String(kobo / 100));
