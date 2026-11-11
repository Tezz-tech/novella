import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import { Panel, PageHeader, Tag, Pager, Empty, naira, inputCls, Field } from '../ui.jsx';
import CountUp from '../../components/motion/CountUp.jsx';

const SOURCE_LABEL = { verify: 'Success page', webhook: 'Webhook', admin_reverify: 'Re-verified' };

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
      <p className="text-xs uppercase tracking-label text-rose-200/70">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone ?? 'text-rose-50'}`}>
        <CountUp value={value / 100} format={(n) => `₦${Math.round(n).toLocaleString('en-NG')}`} />
      </p>
    </div>
  );
}

export default function Payments() {
  const [filters, setFilters] = useState({ status: '', source: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const query = { ...filters, page, limit: 25 };
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'payments', query],
    queryFn: () => api('/admin/payments', { query }),
    placeholderData: (prev) => prev,
  });

  const flags = data?.flags;
  const flagList = flags
    ? [
        [
          'Amount mismatches',
          flags.amountMismatches,
          'Paid amount differed from the order. Never fulfilled.',
        ],
        [
          'Paid with stock issue',
          flags.paidWithStockIssue,
          'Stock was short at payment. Check before shipping.',
        ],
        [
          'Pending over an hour',
          flags.pendingOverOneHour,
          'Customer started paying and did not finish.',
        ],
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Every Paystack event and attempt, with the totals and anything that needs a look."
      />

      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error.message}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Collected" value={data?.totals?.collected ?? 0} />
        <Stat label="Paystack fees" value={data?.totals?.fees ?? 0} />
        <Stat label="Refunded" value={data?.totals?.refunded ?? 0} tone="text-danger" />
        <Stat label="Net" value={data?.totals?.net ?? 0} tone="text-success" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {flagList.map(([label, n, hint]) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 ${n ? 'border-spark-400/50 bg-spark-400/5' : 'border-ink-700 bg-ink-900'}`}
          >
            <p className="text-sm text-rose-50">
              {label}: <span className="tabular-nums font-semibold">{n}</span>
            </p>
            <p className="mt-1 text-xs text-rose-50/60">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Payment events" className="xl:col-span-2">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Field label="Outcome">
              <select
                className={inputCls}
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setPage(1);
                }}
              >
                <option value="">Any</option>
                {['success', 'failed', 'abandoned', 'mismatch'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select
                className={inputCls}
                value={filters.source}
                onChange={(e) => {
                  setFilters({ ...filters, source: e.target.value });
                  setPage(1);
                }}
              >
                <option value="">Any</option>
                {Object.entries(SOURCE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="From">
              <input
                type="date"
                className={inputCls}
                value={filters.from}
                onChange={(e) => {
                  setFilters({ ...filters, from: e.target.value });
                  setPage(1);
                }}
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                className={inputCls}
                value={filters.to}
                onChange={(e) => {
                  setFilters({ ...filters, to: e.target.value });
                  setPage(1);
                }}
              />
            </Field>
          </div>

          {isLoading && !data ? (
            <p className="py-10 text-center text-sm text-rose-50/60">Loading…</p>
          ) : data?.items?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-label text-rose-50/50">
                  <tr>
                    <th className="py-2 font-medium">When</th>
                    <th className="font-medium">Order</th>
                    <th className="font-medium">Reference</th>
                    <th className="font-medium">Source</th>
                    <th className="font-medium">Outcome</th>
                    <th className="text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700">
                  {data.items.map((p) => (
                    <tr key={p._id} className="hover:bg-rose-400/5">
                      <td className="py-2.5 text-rose-50/65">{formatDate(p.createdAt)}</td>
                      <td>
                        {p.order ? (
                          <Link
                            to={`/admin/orders/${p.order._id ?? p.order}`}
                            className="text-rose-100 hover:text-rose-200"
                          >
                            {p.order.orderNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="max-w-[12rem] truncate text-xs text-rose-50/60">
                        {p.reference}
                      </td>
                      <td>{SOURCE_LABEL[p.source] ?? p.source}</td>
                      <td>
                        <Tag
                          tone={
                            p.status === 'success'
                              ? 'success'
                              : p.status === 'mismatch' || p.status === 'failed'
                                ? 'danger'
                                : 'warn'
                          }
                        >
                          {p.status}
                        </Tag>
                      </td>
                      <td className="text-right tabular-nums">{naira(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No payment events match these filters.</Empty>
          )}
          <Pager page={data?.page ?? 1} pages={data?.pages ?? 1} onChange={setPage} />
        </Panel>

        <Panel title="Refunds">
          {data?.refunds?.length ? (
            <ul className="divide-y divide-ink-700 text-sm">
              {data.refunds.map((r) => (
                <li key={r._id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-rose-50">{r.order?.orderNumber ?? 'Order'}</p>
                    <p className="text-xs text-rose-50/55">
                      {formatDate(r.createdAt)} · {r.reason || 'No reason given'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">{naira(r.amount)}</p>
                    <Tag
                      tone={
                        r.status === 'processed'
                          ? 'success'
                          : r.status === 'failed'
                            ? 'danger'
                            : 'warn'
                      }
                    >
                      {r.status}
                    </Tag>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No refunds yet.</Empty>
          )}
        </Panel>
      </div>
    </>
  );
}
