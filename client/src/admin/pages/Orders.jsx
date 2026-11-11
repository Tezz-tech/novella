import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import {
  Panel,
  PageHeader,
  OrderStatusTag,
  PaymentTag,
  Pager,
  Empty,
  naira,
  inputCls,
  Field,
} from '../ui.jsx';
import { ORDER_STATUS_LABELS } from '../labels.js';

const TABS = [
  ['all', 'All'],
  ['pending_payment', 'Pending payment'],
  ['paid', 'Paid'],
  ['processing', 'Processing'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
  ['refunded', 'Refunded'],
];

const exportUrl = (query) => {
  const base = '/api';
  const qs = new URLSearchParams({ ...query, format: 'csv' }).toString();
  return `${base}/admin/orders?${qs}`;
};

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const status = params.get('status') ?? 'all';
  const page = Number(params.get('page') ?? 1);
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const paymentStatus = params.get('paymentStatus') ?? '';
  const state = params.get('state') ?? '';

  const query = {
    status: status === 'all' ? '' : status,
    q: params.get('q') ?? '',
    from,
    to,
    paymentStatus,
    state,
    page,
    limit: 25,
  };
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'orders', query],
    queryFn: () => api('/admin/orders', { query }),
    placeholderData: (prev) => prev,
  });

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Work through paid orders, shipping and refunds."
        actions={
          <a
            href={exportUrl(query)}
            className="rounded-pill border border-rose-400/60 px-4 py-2 text-sm text-rose-100 hover:bg-rose-400/10"
          >
            Export CSV
          </a>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Order status">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => update({ status: value === 'all' ? '' : value })}
            className={`rounded-pill border px-3.5 py-1.5 text-xs ${status === value ? 'border-rose-400 bg-rose-400/15 text-rose-50' : 'border-ink-700 text-rose-50/65 hover:border-rose-400/50'}`}
          >
            {label}
            {data?.counts && (value === 'all' ? data.counts.all : data.counts[value]) != null && (
              <span className="ml-1.5 text-rose-300">
                {value === 'all' ? data.counts.all : (data.counts[value] ?? 0)}
              </span>
            )}
          </button>
        ))}
      </div>

      <Panel>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: q.trim() });
          }}
          className="mb-5 grid gap-3 md:grid-cols-6"
        >
          <div className="md:col-span-2">
            <Field label="Search">
              <input
                className={inputCls}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Order no., name, phone, email"
              />
            </Field>
          </div>
          <Field label="Payment">
            <select
              className={inputCls}
              value={paymentStatus}
              onChange={(e) => update({ paymentStatus: e.target.value })}
            >
              <option value="">Any</option>
              {['paid', 'unpaid', 'failed', 'refunded', 'partially_refunded'].map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From">
            <input
              type="date"
              className={inputCls}
              value={from}
              onChange={(e) => update({ from: e.target.value })}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              className={inputCls}
              value={to}
              onChange={(e) => update({ to: e.target.value })}
            />
          </Field>
          <Field label="State">
            <input
              className={inputCls}
              value={state}
              onChange={(e) => update({ state: e.target.value })}
              placeholder="e.g. Lagos"
            />
          </Field>
          <div className="md:col-span-6 flex justify-end">
            <button type="submit" className="text-xs text-rose-200 underline underline-offset-4">
              Apply search
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error.message}
          </p>
        )}

        {isLoading && !data ? (
          <p className="py-10 text-center text-sm text-rose-50/60">Loading orders…</p>
        ) : data?.items?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-label text-rose-50/50">
                <tr>
                  <th className="py-2 font-medium">Order</th>
                  <th className="font-medium">Date</th>
                  <th className="font-medium">Customer</th>
                  <th className="font-medium">Where</th>
                  <th className="font-medium">Items</th>
                  <th className="font-medium">Payment</th>
                  <th className="font-medium">Status</th>
                  <th className="text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {data.items.map((o) => (
                  <tr key={o._id} className="hover:bg-rose-400/5">
                    <td className="py-3">
                      <Link
                        to={`/admin/orders/${o._id}`}
                        className="font-medium text-rose-100 hover:text-rose-200"
                      >
                        {o.orderNumber}
                      </Link>
                      {o.stockIssue && <span className="ml-2 text-xs text-spark-400">stock</span>}
                    </td>
                    <td className="text-rose-50/65">{formatDate(o.createdAt)}</td>
                    <td>
                      <p>{o.customer.name}</p>
                      <p className="text-xs text-rose-50/55">{o.customer.phone}</p>
                    </td>
                    <td className="text-rose-50/70">
                      {o.delivery?.method === 'pickup'
                        ? 'Pickup'
                        : `${o.delivery?.address?.city ?? ''}, ${o.delivery?.address?.state ?? ''}`}
                    </td>
                    <td className="tabular-nums">{o.itemCount}</td>
                    <td>
                      <PaymentTag status={o.paymentStatus} />
                    </td>
                    <td>
                      <OrderStatusTag status={o.status} />
                    </td>
                    <td className="text-right tabular-nums">{naira(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No orders match these filters.</Empty>
        )}

        <Pager
          page={data?.page ?? 1}
          pages={data?.pages ?? 1}
          onChange={(p) => update({ page: p })}
        />
      </Panel>
    </>
  );
}

export { ORDER_STATUS_LABELS };
