import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import {
  Panel,
  PageHeader,
  Tag,
  Pager,
  Empty,
  naira,
  inputCls,
  OrderStatusTag,
  Field,
} from '../ui.jsx';
import { Drawer } from '../../components/ui/Overlay.jsx';

function CustomerDrawer({ email, onClose }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'customer', email],
    queryFn: () => api(`/admin/customers/${encodeURIComponent(email)}`),
    enabled: Boolean(email),
  });
  return (
    <Drawer open={Boolean(email)} onClose={onClose} label="Customer details">
      <div className="max-h-screen space-y-6 overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg text-rose-50">
              {data?.account?.name ?? data?.orders?.[0]?.customer?.name ?? email}
            </h2>
            <p className="text-sm text-rose-50/60">{email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-rose-200 underline underline-offset-4"
          >
            Close
          </button>
        </div>
        {isLoading && <p className="text-sm text-rose-50/60">Loading…</p>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error.message}
          </p>
        )}
        {data && (
          <>
            <div className="flex flex-wrap gap-3 text-sm">
              <Tag tone={data.type === 'registered' ? 'success' : 'neutral'}>{data.type}</Tag>
              <Tag>{naira(data.lifetimeSpend)} lifetime</Tag>
              <Tag>{data.orders.length} order(s)</Tag>
            </div>
            <Panel title="Orders">
              <ul className="divide-y divide-ink-700 text-sm">
                {data.orders.map((o) => (
                  <li key={o._id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link
                      to={`/admin/orders/${o._id}`}
                      className="text-rose-100 hover:text-rose-200"
                    >
                      {o.orderNumber}
                    </Link>
                    <span className="text-xs text-rose-50/55">{formatDate(o.createdAt)}</span>
                    <OrderStatusTag status={o.status} />
                    <span className="tabular-nums">{naira(o.total)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            {data.addresses?.length > 0 && (
              <Panel title="Addresses">
                <ul className="space-y-2 text-sm text-rose-50/80">
                  {data.addresses.map((a, i) => (
                    <li key={i}>{[a.line1, a.city, a.state].filter(Boolean).join(', ')}</li>
                  ))}
                </ul>
              </Panel>
            )}
            {data.account?.wishlist?.length > 0 && (
              <Panel title="Wishlist">
                <ul className="list-disc space-y-1 pl-5 text-sm text-rose-50/80">
                  {data.account.wishlist.map((w) => (
                    <li key={w._id}>{w.name}</li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}

export default function Customers() {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(null);
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'customers', q, page],
    queryFn: () => api('/admin/customers', { query: { q, page, limit: 25 } }),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Everyone who has ordered, including guests. Registered accounts are marked."
      />
      <Panel>
        <form
          className="mb-5 max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams();
            const v = new FormData(e.currentTarget).get('q');
            if (v) next.set('q', String(v));
            setParams(next);
          }}
        >
          <Field label="Search">
            <input
              name="q"
              defaultValue={q}
              className={inputCls}
              placeholder="Name, email or phone"
            />
          </Field>
        </form>

        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error.message}
          </p>
        )}
        {isLoading && !data ? (
          <p className="py-10 text-center text-sm text-rose-50/60">Loading…</p>
        ) : data?.items?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-label text-rose-50/50">
                <tr>
                  <th className="py-2 font-medium">Customer</th>
                  <th className="font-medium">Type</th>
                  <th className="font-medium">Orders</th>
                  <th className="font-medium">Lifetime spend</th>
                  <th className="font-medium">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {data.items.map((c) => (
                  <tr
                    key={c.email}
                    className="cursor-pointer hover:bg-rose-400/5"
                    onClick={() => setOpen(c.email)}
                  >
                    <td className="py-3">
                      <p className="text-rose-50">{c.name}</p>
                      <p className="text-xs text-rose-50/55">
                        {c.email} · {c.phone}
                      </p>
                    </td>
                    <td>
                      <Tag tone={c.type === 'registered' ? 'success' : 'neutral'}>{c.type}</Tag>
                    </td>
                    <td className="tabular-nums">{c.orders}</td>
                    <td className="tabular-nums">{naira(c.lifetimeSpend)}</td>
                    <td className="text-rose-50/65">{formatDate(c.lastOrderAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No customers yet.</Empty>
        )}
        <Pager
          page={data?.page ?? 1}
          pages={data?.pages ?? 1}
          onChange={(p) => {
            const n = new URLSearchParams(params);
            n.set('page', String(p));
            setParams(n);
          }}
        />
      </Panel>
      <CustomerDrawer email={open} onClose={() => setOpen(null)} />
    </>
  );
}
