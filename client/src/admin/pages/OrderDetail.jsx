import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import { toast } from '../../store/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import {
  Panel,
  PageHeader,
  OrderStatusTag,
  PaymentTag,
  Tag,
  inputCls,
  Field,
  naira,
  useConfirm,
  nairaInput,
} from '../ui.jsx';
import { NEXT_STATUS, ORDER_STATUS_LABELS } from '../labels.js';

const RANK = { customer: 0, staff: 1, admin: 2, owner: 3 };

function Stepper({ status }) {
  const steps = ['paid', 'processing', 'shipped', 'delivered'];
  const idx = steps.indexOf(status);
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Fulfilment progress">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${i <= idx ? 'border-rose-400 bg-rose-400/25 text-rose-50' : 'border-ink-700 text-rose-50/40'}`}
          >
            {i + 1}
          </span>
          <span className={`hidden sm:inline ${i <= idx ? 'text-rose-100' : 'text-rose-50/40'}`}>
            {ORDER_STATUS_LABELS[s]}
          </span>
          {i < steps.length - 1 && (
            <span className={`h-px flex-1 ${i < idx ? 'bg-rose-400' : 'bg-ink-700'}`} />
          )}
        </li>
      ))}
    </ol>
  );
}

function ShipForm({ onSubmit, busy }) {
  const { register, handleSubmit } = useForm({
    defaultValues: { courier: '', trackingNumber: '', trackingUrl: '' },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-3 sm:grid-cols-3">
      <Field label="Courier">
        <input className={inputCls} {...register('courier')} placeholder="GIG, Kwik…" />
      </Field>
      <Field label="Tracking number">
        <input className={inputCls} {...register('trackingNumber')} />
      </Field>
      <Field label="Tracking link">
        <input className={inputCls} {...register('trackingUrl')} placeholder="https://" />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit" loading={busy}>
          Mark as shipped
        </Button>
      </div>
    </form>
  );
}

function RefundModal({ open, onClose, order, onDone }) {
  const remaining =
    order.total -
    (order.refunds ?? []).filter((r) => r.status !== 'failed').reduce((n, r) => n + r.amount, 0);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { amount: nairaInput(remaining), reason: '', restock: false },
  });
  const mutation = useMutation({
    mutationFn: (v) =>
      api(`/admin/orders/${order._id}/refund`, {
        method: 'POST',
        body: {
          amount: v.amount ? Number(v.amount) : undefined,
          reason: v.reason,
          restock: v.restock,
        },
      }),
    onSuccess: () => {
      toast.success('Refund sent to Paystack. It will show here once processed.');
      reset();
      onDone();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <Modal open={open} onClose={onClose} label="Refund order">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5 p-6">
        <h2 className="text-lg">Refund {order.orderNumber}</h2>
        <p className="text-sm text-rose-50/70">
          Up to {naira(remaining)} can still be refunded. Paystack processes it and the status
          updates by itself.
        </p>
        <Field label="Amount (₦)">
          <input className={inputCls} type="number" step="0.01" min="1" {...register('amount')} />
        </Field>
        <Field label="Reason (internal)">
          <input className={inputCls} {...register('reason')} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-rose-50/85">
          <input type="checkbox" className="accent-rose-400" {...register('restock')} />
          Put the items back into stock
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={mutation.isPending}>
            Refund
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const role = RANK[user?.role] ?? 0;
  const { ask, dialog } = useConfirm();
  const [refundOpen, setRefundOpen] = useState(false);
  const [note, setNote] = useState('');
  const {
    data: o,
    isLoading,
    error,
  } = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => api(`/admin/orders/${id}`) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'order', id] });
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
  };

  const setStatus = useMutation({
    mutationFn: (body) => api(`/admin/orders/${id}/status`, { method: 'PATCH', body }),
    onSuccess: () => {
      toast.success('Status updated. The customer has been emailed.');
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });
  const saveNotes = useMutation({
    mutationFn: (adminNotes) =>
      api(`/admin/orders/${id}/notes`, { method: 'PATCH', body: { adminNotes } }),
    onSuccess: () => {
      toast.success('Notes saved');
      refresh();
    },
  });
  const reverify = useMutation({
    mutationFn: () => api(`/admin/payments/${o.payment.reference}/reverify`, { method: 'POST' }),
    onSuccess: (r) => {
      toast.info(`Paystack says: ${r.status}`);
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <p className="py-16 text-center text-rose-50/60">Loading order…</p>;
  if (error || !o)
    return (
      <p role="alert" className="text-danger">
        {error?.message ?? 'Order not found'}
      </p>
    );

  const addr = o.delivery?.address;
  const mapsUrl = addr?.line1
    ? `https://www.google.com/maps/search/${encodeURIComponent(`${addr.line1}, ${addr.city}, ${addr.state}, Nigeria`)}`
    : null;
  const copyAddress = () => {
    const text = [
      o.customer.name,
      o.customer.phone,
      addr?.line1,
      addr?.line2,
      addr?.landmark,
      addr?.city,
      addr?.state,
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard?.writeText(text).then(
      () => toast.success('Address copied'),
      () => toast.error('Could not copy. Select and copy manually.')
    );
  };
  const wa = (o.customer.phone || '').replace(/\D/g, '');
  const nextOptions = NEXT_STATUS[o.status] ?? [];
  const canRefund = role >= RANK.admin && ['paid', 'partially_refunded'].includes(o.paymentStatus);

  return (
    <>
      <PageHeader
        title={o.orderNumber}
        subtitle={`Placed ${formatDate(o.createdAt)} · ${o.delivery.method === 'pickup' ? 'Pickup' : 'Delivery'}`}
        actions={
          <>
            <OrderStatusTag status={o.status} />
            <PaymentTag status={o.paymentStatus} />
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              Print packing slip
            </Button>
            <Link to="/admin/orders" className="text-sm text-rose-200 underline underline-offset-4">
              All orders
            </Link>
          </>
        }
      />

      {o.stockIssue && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-spark-400/50 bg-spark-400/5 p-4 text-sm text-spark-400"
        >
          Stock was short when this order was paid. Check the items below before you ship.
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-ink-700 bg-ink-900 p-5">
        <Stepper status={o.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Items">
            <ul className="divide-y divide-ink-700">
              {o.items.map((i) => (
                <li key={i._id} className="flex items-start gap-4 py-3 text-sm">
                  <img
                    src={i.image || '/placeholders/product.svg'}
                    alt=""
                    className="h-14 w-14 rounded-xl bg-ink-800 object-contain p-1"
                  />
                  <div className="flex-1">
                    <p className="text-rose-50">{i.name}</p>
                    <p className="text-xs text-rose-50/60">
                      {i.variantLabel} {i.sku && `· ${i.sku}`}
                    </p>
                    {i.comboItems?.length > 0 && (
                      <p className="mt-1 text-xs text-rose-50/55">
                        Includes: {i.comboItems.map((c) => `${c.name} × ${c.qty}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right tabular-nums">
                    <p>
                      {i.qty} × {naira(i.unitPrice)}
                    </p>
                    <p className="text-rose-50">{naira(i.lineTotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-ink-700 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-rose-50/70">Subtotal</dt>
                <dd className="tabular-nums">{naira(o.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rose-50/70">Delivery</dt>
                <dd className="tabular-nums">{naira(o.deliveryFee)}</dd>
              </div>
              {o.discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Discount {o.coupon?.code ? `(${o.coupon.code})` : ''}</dt>
                  <dd className="tabular-nums">−{naira(o.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{naira(o.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Fulfilment">
            {nextOptions.length === 0 && (
              <p className="text-sm text-rose-50/60">No further steps for this order.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {nextOptions
                .filter((s) => s !== 'shipped')
                .map((s) => (
                  <Button
                    key={s}
                    variant={s === 'cancelled' ? 'danger' : 'secondary'}
                    size="sm"
                    disabled={setStatus.isPending}
                    onClick={() =>
                      s === 'cancelled'
                        ? ask(
                            `Cancel order ${o.orderNumber}? The customer will be emailed. Refund separately if money was taken.`,
                            () => setStatus.mutate({ status: s }),
                            { yes: 'Cancel order' }
                          )
                        : setStatus.mutate({ status: s })
                    }
                  >
                    {s === 'processing'
                      ? 'Start processing'
                      : s === 'delivered'
                        ? 'Mark delivered'
                        : 'Cancel order'}
                  </Button>
                ))}
            </div>
            {nextOptions.includes('shipped') && (
              <ShipForm
                busy={setStatus.isPending}
                onSubmit={(v) =>
                  setStatus.mutate({
                    status: 'shipped',
                    ...Object.fromEntries(Object.entries(v).filter(([, x]) => x)),
                  })
                }
              />
            )}
            {o.fulfilment?.trackingNumber && (
              <p className="mt-4 text-sm text-rose-50/75">
                Shipped via {o.fulfilment.courier || 'courier'} · {o.fulfilment.trackingNumber}
                {o.fulfilment.trackingUrl && (
                  <>
                    {' '}
                    ·{' '}
                    <a
                      className="text-rose-200 underline underline-offset-4"
                      href={o.fulfilment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      track
                    </a>
                  </>
                )}
              </p>
            )}
          </Panel>

          <Panel title="Timeline">
            <ol className="space-y-3 border-l border-ink-700 pl-5 text-sm">
              {[...o.timeline].reverse().map((t, i) => (
                <li key={i} className="relative">
                  <span
                    className="absolute -left-[1.45rem] top-1.5 h-2 w-2 rounded-full bg-rose-400"
                    aria-hidden="true"
                  />
                  <p className="text-rose-50">
                    {ORDER_STATUS_LABELS[t.status] ?? t.status}
                    {t.note ? ` — ${t.note}` : ''}
                  </p>
                  <p className="text-xs text-rose-50/50">
                    {formatDate(t.at)} · {t.by}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="text-rose-50">{o.customer.name}</p>
            <p className="text-sm text-rose-50/70">{o.customer.email}</p>
            <p className="text-sm text-rose-50/70">{o.customer.phone}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`tel:${o.customer.phone}`}
                className="rounded-pill border border-ink-700 px-3 py-1.5 text-xs hover:border-rose-400/60"
              >
                Call
              </a>
              {wa && (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-pill border border-ink-700 px-3 py-1.5 text-xs hover:border-rose-400/60"
                >
                  WhatsApp
                </a>
              )}
              <Link
                to={`/admin/customers?q=${encodeURIComponent(o.customer.email)}`}
                className="rounded-pill border border-ink-700 px-3 py-1.5 text-xs hover:border-rose-400/60"
              >
                History
              </Link>
            </div>
          </Panel>

          <Panel
            title="Delivery"
            action={
              addr && (
                <button
                  type="button"
                  onClick={copyAddress}
                  className="text-xs text-rose-200 underline underline-offset-4"
                >
                  Copy address
                </button>
              )
            }
          >
            {addr?.line1 ? (
              <>
                <p className="text-sm text-rose-50">
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ''}
                </p>
                {addr.landmark && (
                  <p className="text-sm text-rose-50/70">Landmark: {addr.landmark}</p>
                )}
                <p className="text-sm text-rose-50/70">
                  {addr.city}, {addr.state}
                </p>
                {o.delivery.notes && (
                  <p className="mt-2 text-sm text-spark-400">Note: {o.delivery.notes}</p>
                )}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs text-rose-200 underline underline-offset-4"
                  >
                    Open in Google Maps
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-rose-50/60">Customer collects at the store.</p>
            )}
          </Panel>

          <Panel title="Payment">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-rose-50/70">Reference</dt>
                <dd className="truncate text-xs">{o.payment.reference}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rose-50/70">Channel</dt>
                <dd>{o.payment.channel || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rose-50/70">Paid at</dt>
                <dd>{o.payment.paidAt ? formatDate(o.payment.paidAt) : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rose-50/70">Card</dt>
                <dd>
                  {o.payment.authorizationLast4
                    ? `•••• ${o.payment.authorizationLast4} ${o.payment.cardType ?? ''}`
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-rose-50/70">Fees</dt>
                <dd className="tabular-nums">{naira(o.payment.fees)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {role >= RANK.admin && o.payment.reference && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={reverify.isPending}
                  onClick={() => reverify.mutate()}
                >
                  Re-verify with Paystack
                </Button>
              )}
              {canRefund && (
                <Button variant="danger" size="sm" onClick={() => setRefundOpen(true)}>
                  Refund
                </Button>
              )}
            </div>
            {o.refunds?.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-ink-700 pt-3 text-xs">
                {o.refunds.map((r) => (
                  <li key={r._id} className="flex justify-between">
                    <span>
                      {formatDate(r.createdAt)} · {r.reason || 'Refund'}
                    </span>
                    <span className="tabular-nums">
                      {naira(r.amount)}{' '}
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
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Internal notes">
            <textarea
              className={`${inputCls} h-24 py-2`}
              defaultValue={o.adminNotes}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Only visible to the team"
            />
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                loading={saveNotes.isPending}
                onClick={() => saveNotes.mutate(note || o.adminNotes || '')}
              >
                Save note
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      <RefundModal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        order={o}
        onDone={refresh}
      />
      {dialog}

      {/* Printable packing slip: hidden on screen, shown by the print stylesheet only. */}
      <section className="hidden print:block" aria-label="Packing slip">
        <h1 className="text-2xl">Packing slip · {o.orderNumber}</h1>
        <p>
          {o.customer.name} · {o.customer.phone}
        </p>
        <p>{addr?.line1 ? `${addr.line1}, ${addr.city}, ${addr.state}` : 'Pickup'}</p>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr>
              <th>Item</th>
              <th>Variant</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i._id}>
                <td>{i.name}</td>
                <td>{i.variantLabel}</td>
                <td>{i.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm">Thank you for shopping with Novelle Tech.</p>
      </section>
    </>
  );
}
