import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import { toast } from '../../store/toast.js';
import Button from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import {
  Panel,
  PageHeader,
  Tag,
  Empty,
  Field,
  inputCls,
  naira,
  nairaInput,
  useConfirm,
} from '../ui.jsx';

function CouponForm({ value, onClose, onSaved }) {
  const { register, handleSubmit, watch } = useForm({
    values: value?._id
      ? {
          code: value.code,
          type: value.type,
          value: value.type === 'fixed' ? nairaInput(value.value) : value.value,
          minSubtotalNaira: nairaInput(value.minSubtotal ?? 0),
          maxDiscountNaira: value.maxDiscount ? nairaInput(value.maxDiscount) : '',
          startsAt: value.startsAt ? value.startsAt.slice(0, 10) : '',
          endsAt: value.endsAt ? value.endsAt.slice(0, 10) : '',
          usageLimit: value.usageLimit ?? '',
          isActive: value.isActive,
        }
      : {
          code: '',
          type: 'percent',
          value: 10,
          minSubtotalNaira: 0,
          maxDiscountNaira: '',
          startsAt: '',
          endsAt: '',
          usageLimit: '',
          isActive: true,
        },
  });
  const type = watch('type');
  const mutation = useMutation({
    mutationFn: (v) => {
      const body = {
        ...v,
        value: Number(v.value),
        minSubtotalNaira: Number(v.minSubtotalNaira || 0),
        maxDiscountNaira: v.maxDiscountNaira ? Number(v.maxDiscountNaira) : null,
        startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null,
        endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
        usageLimit: v.usageLimit ? Number(v.usageLimit) : null,
      };
      return value?._id
        ? api(`/admin/coupons/${value._id}`, { method: 'PUT', body })
        : api('/admin/coupons', { method: 'POST', body });
    },
    onSuccess: () => {
      toast.success('Coupon saved');
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <Modal open={value !== null} onClose={onClose} label="Coupon">
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="max-h-[85vh] space-y-4 overflow-y-auto p-6"
      >
        <h2 className="text-lg">{value?._id ? 'Edit coupon' : 'New coupon'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code">
            <input
              className={`${inputCls} uppercase`}
              {...register('code', { required: true })}
              disabled={Boolean(value?._id)}
            />
          </Field>
          <Field label="Type">
            <select className={inputCls} {...register('type')}>
              <option value="percent">Percent off</option>
              <option value="fixed">Naira off</option>
            </select>
          </Field>
          <Field label={type === 'percent' ? 'Percent (1–100)' : 'Amount off (₦)'}>
            <input
              type="number"
              step="any"
              min="0"
              className={inputCls}
              {...register('value', { required: true })}
            />
          </Field>
          <Field label="Minimum spend (₦)">
            <input
              type="number"
              step="any"
              min="0"
              className={inputCls}
              {...register('minSubtotalNaira')}
            />
          </Field>
          <Field label="Maximum discount (₦, optional)">
            <input
              type="number"
              step="any"
              min="0"
              className={inputCls}
              {...register('maxDiscountNaira')}
            />
          </Field>
          <Field label="Usage limit (optional)">
            <input type="number" min="1" className={inputCls} {...register('usageLimit')} />
          </Field>
          <Field label="Starts">
            <input type="date" className={inputCls} {...register('startsAt')} />
          </Field>
          <Field label="Ends">
            <input type="date" className={inputCls} {...register('endsAt')} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-rose-400" {...register('isActive')} />
          Active
        </label>
        <p className="text-xs text-rose-50/55">
          Coupons only work when “Coupons” is switched on in Settings.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Save coupon
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Coupons() {
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const [editing, setEditing] = useState(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: () => api('/admin/coupons'),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
  const deactivate = useMutation({
    mutationFn: (c) =>
      api(`/admin/coupons/${c._id}`, {
        method: 'PUT',
        body: {
          isActive: false,
          type: c.type,
          value: c.type === 'fixed' ? c.value / 100 : c.value,
        },
      }),
    onSuccess: () => {
      toast.success('Coupon switched off');
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <Panel
      title="Coupons"
      action={
        <Button size="sm" onClick={() => setEditing({})}>
          New coupon
        </Button>
      }
    >
      {isLoading ? (
        <p className="py-6 text-sm text-rose-50/60">Loading…</p>
      ) : data.length === 0 ? (
        <Empty>No coupons yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-label text-rose-50/50">
              <tr>
                <th className="py-2 font-medium">Code</th>
                <th className="font-medium">Offer</th>
                <th className="font-medium">Min spend</th>
                <th className="font-medium">Used</th>
                <th className="font-medium">Ends</th>
                <th className="font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {data.map((c) => (
                <tr key={c._id}>
                  <td className="py-2.5 font-medium text-rose-100">{c.code}</td>
                  <td>{c.type === 'percent' ? `${c.value}% off` : `${naira(c.value)} off`}</td>
                  <td className="tabular-nums">{naira(c.minSubtotal)}</td>
                  <td className="tabular-nums">
                    {c.usedCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                  </td>
                  <td className="text-rose-50/65">{c.endsAt ? formatDate(c.endsAt) : 'No end'}</td>
                  <td>
                    <Tag tone={c.isActive ? 'success' : 'neutral'}>
                      {c.isActive ? 'active' : 'off'}
                    </Tag>
                  </td>
                  <td className="space-x-3 text-right text-xs">
                    <button
                      type="button"
                      className="text-rose-200 underline underline-offset-4"
                      onClick={() => setEditing(c)}
                    >
                      Edit
                    </button>
                    {c.isActive && (
                      <button
                        type="button"
                        className="text-rose-50/60 underline underline-offset-4 hover:text-danger"
                        onClick={() =>
                          ask(
                            `Switch off ${c.code}? Customers will no longer be able to use it.`,
                            () => deactivate.mutate(c),
                            { yes: 'Switch off' }
                          )
                        }
                      >
                        Switch off
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CouponForm value={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      {dialog}
    </Panel>
  );
}

function Homepage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api('/admin/settings'),
  });
  const { register, control, handleSubmit, reset } = useForm({
    values: {
      announcementBar: settings?.announcementBar ?? '',
      heroSlides: settings?.heroSlides ?? [],
    },
  });
  const slides = useFieldArray({ control, name: 'heroSlides' });
  const save = useMutation({
    mutationFn: (v) => api('/admin/marketing', { method: 'PUT', body: v }),
    onSuccess: () => {
      toast.success('Homepage updated');
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      reset(undefined, { keepValues: true });
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <Panel title="Homepage">
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
        <Field label="Announcement bar (leave empty to hide)">
          <input className={inputCls} maxLength={200} {...register('announcementBar')} />
        </Field>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-rose-50">Hero slides</p>
            <Button
              size="sm"
              variant="secondary"
              disabled={slides.fields.length >= 6}
              onClick={() =>
                slides.append({
                  image: '',
                  title: '',
                  subtitle: '',
                  ctaLabel: 'Shop now',
                  ctaLink: '/shop',
                })
              }
            >
              Add slide
            </Button>
          </div>
          {slides.fields.map((f, i) => (
            <div
              key={f.id}
              className="grid gap-3 rounded-xl border border-ink-700 p-4 sm:grid-cols-2"
            >
              <Field label="Title">
                <input className={inputCls} {...register(`heroSlides.${i}.title`)} />
              </Field>
              <Field label="Subtitle">
                <input className={inputCls} {...register(`heroSlides.${i}.subtitle`)} />
              </Field>
              <Field label="Button text">
                <input className={inputCls} {...register(`heroSlides.${i}.ctaLabel`)} />
              </Field>
              <Field label="Button link">
                <input className={inputCls} {...register(`heroSlides.${i}.ctaLink`)} />
              </Field>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  className="text-xs text-rose-50/60 underline underline-offset-4 hover:text-danger"
                  onClick={() => slides.remove(i)}
                >
                  Remove slide
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs text-rose-50/55">
            The storefront hero currently shows the featured product; slides are stored for the next
            homepage update.
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>
            Save homepage
          </Button>
        </div>
      </form>
    </Panel>
  );
}

export default function Marketing() {
  return (
    <>
      <PageHeader title="Marketing" subtitle="Coupons and what the homepage says." />
      <div className="grid gap-6">
        <Coupons />
        <Homepage />
      </div>
    </>
  );
}
