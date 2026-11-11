import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import CountUp from '../../components/motion/CountUp.jsx';
import { Panel, PageHeader, OrderStatusTag, PaymentTag, Empty, naira } from '../ui.jsx';
import { RANGES, ORDER_STATUS_LABELS } from '../labels.js';
import { Skeleton } from '../../components/ui/display.jsx';

const CHART = {
  pink: '#E88FBF',
  rose: '#F5A8CC',
  dim: '#603B50',
  grid: '#241A24',
  text: 'rgba(255,240,246,0.6)',
};
const PIE = [
  '#E88FBF',
  '#F5A8CC',
  '#D884A8',
  '#902F54',
  '#FCD3E6',
  '#F5C451',
  '#5ED3A0',
  '#FF6B8A',
];

function Kpi({ label, value, change, format, hint }) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
      <p className="text-xs uppercase tracking-label text-rose-200/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-rose-50">
        <CountUp value={value} format={format} />
      </p>
      <p className="mt-1 text-xs text-rose-50/55">
        {change === 0 ? (
          <span className="text-rose-50/55">No change vs previous period</span>
        ) : change != null ? (
          <span className={change > 0 ? 'text-success' : 'text-danger'}>
            {change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs previous period
          </span>
        ) : (
          hint
        )}
      </p>
    </div>
  );
}

export function Overview() {
  const [range, setRange] = useState('7d');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard', range],
    queryFn: () => api(`/admin/dashboard?range=${range}`),
    refetchInterval: 30_000,
  });

  const k = data?.kpis;
  const statusRows = Object.entries(data?.ordersByStatus ?? {}).map(([name, value]) => ({
    name: ORDER_STATUS_LABELS[name] ?? name,
    value,
  }));
  const series = (data?.series ?? []).map((d) => ({
    day: d._id.slice(5),
    revenue: Math.round(d.revenue / 100),
    orders: d.orders,
  }));

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="How the store is doing right now."
        actions={
          <div
            className="inline-flex rounded-pill border border-ink-700 p-1"
            role="group"
            aria-label="Date range"
          >
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                aria-pressed={range === r.id}
                className={`rounded-pill px-3 py-1.5 text-xs ${range === r.id ? 'bg-rose-400/20 text-rose-50' : 'text-rose-50/60 hover:text-rose-50'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error.message}
        </p>
      )}

      {isLoading || !k ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Kpi
            label="Revenue (paid)"
            value={k.revenue.value / 100}
            change={k.revenue.change}
            format={(n) => `₦${Math.round(n).toLocaleString('en-NG')}`}
          />
          <Kpi label="Orders" value={k.orders.value} hint="Excludes unpaid and cancelled" />
          <Kpi
            label="Average order"
            value={k.averageOrder.value / 100}
            change={k.averageOrder.change}
            format={(n) => `₦${Math.round(n).toLocaleString('en-NG')}`}
          />
          <Kpi label="Pending to ship" value={k.pendingToShip.value} hint="Paid or processing" />
          <Kpi
            label="New customers"
            value={k.newCustomers.value}
            hint="Accounts created in range"
          />
          <Kpi
            label="Refunds"
            value={k.refunds.value / 100}
            change={k.refunds.change}
            format={(n) => `₦${Math.round(n).toLocaleString('en-NG')}`}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Revenue" className="xl:col-span-2">
          <div className="h-64">
            {series.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.pink} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={CHART.pink} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke={CHART.text}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={CHART.text}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₦${Math.round(v / 1000)}k`}
                    width={56}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#171018',
                      border: '1px solid #241A24',
                      borderRadius: 12,
                    }}
                    formatter={(v) => [`₦${Number(v).toLocaleString('en-NG')}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART.pink}
                    strokeWidth={2}
                    fill="url(#rev)"
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty>No paid orders in this range yet.</Empty>
            )}
          </div>
        </Panel>

        <Panel title="Orders by status">
          <div className="h-64">
            {statusRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusRows}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    isAnimationActive
                  >
                    {statusRows.map((_, i) => (
                      <Cell key={i} fill={PIE[i % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#171018',
                      border: '1px solid #241A24',
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty>No orders yet.</Empty>
            )}
          </div>
        </Panel>

        <Panel title="Top products" className="xl:col-span-1">
          {data?.topProducts?.length ? (
            <ol className="space-y-3 text-sm">
              {data.topProducts.map((p, i) => (
                <li key={p._id} className="flex items-center justify-between gap-3">
                  <span className="text-rose-50/85">
                    <span className="mr-2 text-rose-300">{i + 1}.</span>
                    {p.name}
                  </span>
                  <span className="tabular-nums text-rose-50/70">
                    {p.units} × · {naira(p.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>No sales in this range.</Empty>
          )}
        </Panel>

        <Panel title="Orders by state" className="xl:col-span-2">
          <div className="h-64">
            {data?.ordersByState?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.ordersByState.map((s) => ({
                    state: s._id ?? 'Pickup',
                    orders: s.orders,
                  }))}
                >
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="state"
                    stroke={CHART.text}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-25}
                    height={60}
                  />
                  <YAxis
                    stroke={CHART.text}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#171018',
                      border: '1px solid #241A24',
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="orders" fill={CHART.rose} radius={[6, 6, 0, 0]} isAnimationActive />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty>No deliveries in this range.</Empty>
            )}
          </div>
        </Panel>

        <Panel
          title="Low stock"
          action={
            <Link
              to="/admin/products?sort=stock_asc"
              className="text-xs text-rose-200 underline underline-offset-4"
            >
              All products
            </Link>
          }
        >
          {data?.lowStock?.length ? (
            <ul className="divide-y divide-ink-700 text-sm">
              {data.lowStock.map((r) => (
                <li
                  key={`${r.productId}-${r.variantId}`}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <Link
                    to={`/admin/products/${r.productId}`}
                    className="truncate text-rose-50/85 hover:text-rose-200"
                  >
                    {r.name} · {r.label}
                  </Link>
                  <span
                    className={`tabular-nums ${r.stock === 0 ? 'text-danger' : 'text-spark-400'}`}
                  >
                    {r.stock} left
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Stock levels look healthy.</Empty>
          )}
        </Panel>

        <Panel title="Recent orders" className="xl:col-span-3">
          {data?.recentOrders?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-label text-rose-50/50">
                  <tr>
                    <th className="py-2 font-medium">Order</th>
                    <th className="font-medium">Customer</th>
                    <th className="font-medium">Date</th>
                    <th className="font-medium">Payment</th>
                    <th className="font-medium">Status</th>
                    <th className="text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700">
                  {data.recentOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-rose-400/5">
                      <td className="py-2.5">
                        <Link
                          to={`/admin/orders/${o._id}`}
                          className="text-rose-100 hover:text-rose-200"
                        >
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td>{o.customer.name}</td>
                      <td className="text-rose-50/60">{formatDate(o.createdAt)}</td>
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
            <Empty>No orders yet. They will appear here as they come in.</Empty>
          )}
        </Panel>
      </div>
    </>
  );
}

export default Overview;
