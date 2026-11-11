import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import { toast } from '../../store/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../../components/ui/Button.jsx';
import { Panel, PageHeader, Tag, Empty, Field, inputCls, useConfirm, Pager } from '../ui.jsx';
import { ROLE_LABELS } from '../labels.js';

const RANK = { customer: 0, staff: 1, admin: 2, owner: 3 };

function StoreForm({ settings, canEdit }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit } = useForm({
    values: settings
      ? {
          storeName: settings.storeName ?? '',
          tagline: settings.tagline ?? '',
          phone: settings.contact?.phone ?? '',
          whatsapp: settings.contact?.whatsapp ?? '',
          email: settings.contact?.email ?? '',
          instagram: settings.contact?.instagram ?? '',
          tiktok: settings.contact?.tiktok ?? '',
          address: settings.contact?.address ?? '',
          lowStockDefault: settings.lowStockDefault ?? 3,
          returns: settings.policies?.returns ?? '',
          privacy: settings.policies?.privacy ?? '',
          terms: settings.policies?.terms ?? '',
          faq: settings.faq ?? [],
          couponsOn: Boolean(settings.features?.coupons),
          reviewsOn: Boolean(settings.features?.reviews),
          newsletterOn: settings.features?.newsletter !== false,
          backInStockOn: Boolean(settings.features?.notifyWhenBackInStock),
        }
      : undefined,
  });
  const faq = useFieldArray({ control, name: 'faq' });
  const save = useMutation({
    mutationFn: (v) =>
      api('/admin/settings', {
        method: 'PUT',
        body: {
          storeName: v.storeName,
          tagline: v.tagline,
          contact: {
            phone: v.phone,
            whatsapp: v.whatsapp,
            email: v.email,
            instagram: v.instagram,
            tiktok: v.tiktok,
            address: v.address,
          },
          lowStockDefault: Number(v.lowStockDefault),
          policies: { returns: v.returns, privacy: v.privacy, terms: v.terms },
          faq: v.faq.filter((f) => f.question && f.answer),
          features: {
            coupons: v.couponsOn,
            reviews: v.reviewsOn,
            newsletter: v.newsletterOn,
            notifyWhenBackInStock: v.backInStockOn,
          },
        },
      }),
    onSuccess: () => {
      toast.success('Store settings saved. Logged.');
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (err) => toast.error(err.message),
  });
  const disabled = !canEdit;

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
      <Panel title="Store">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Store name">
            <input disabled={disabled} className={inputCls} {...register('storeName')} />
          </Field>
          <Field label="Tagline">
            <input disabled={disabled} className={inputCls} {...register('tagline')} />
          </Field>
          <Field label="Phone">
            <input disabled={disabled} className={inputCls} {...register('phone')} />
          </Field>
          <Field label="WhatsApp (digits, with country code)">
            <input disabled={disabled} className={inputCls} {...register('whatsapp')} />
          </Field>
          <Field label="Email">
            <input disabled={disabled} className={inputCls} {...register('email')} />
          </Field>
          <Field label="Address">
            <input disabled={disabled} className={inputCls} {...register('address')} />
          </Field>
          <Field label="Instagram link">
            <input disabled={disabled} className={inputCls} {...register('instagram')} />
          </Field>
          <Field label="TikTok link">
            <input disabled={disabled} className={inputCls} {...register('tiktok')} />
          </Field>
          <Field label="Low-stock warning at">
            <input
              type="number"
              min="0"
              disabled={disabled}
              className={inputCls}
              {...register('lowStockDefault')}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Features">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['couponsOn', 'Coupons at checkout'],
            ['reviewsOn', 'Product reviews (after delivery)'],
            ['newsletterOn', 'Newsletter signup'],
            ['backInStockOn', 'Notify me when back in stock'],
          ].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-rose-50/85">
              <input
                type="checkbox"
                disabled={disabled}
                className="accent-rose-400"
                {...register(k)}
              />
              {l}
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Policies">
        <div className="grid gap-4">
          <Field label="Returns">
            <textarea
              disabled={disabled}
              className={`${inputCls} h-28 py-2`}
              {...register('returns')}
            />
          </Field>
          <Field label="Privacy">
            <textarea
              disabled={disabled}
              className={`${inputCls} h-28 py-2`}
              {...register('privacy')}
            />
          </Field>
          <Field label="Terms of sale">
            <textarea
              disabled={disabled}
              className={`${inputCls} h-28 py-2`}
              {...register('terms')}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="FAQ"
        action={
          !disabled && (
            <button
              type="button"
              className="text-xs text-rose-200 underline underline-offset-4"
              onClick={() => faq.append({ question: '', answer: '' })}
            >
              Add question
            </button>
          )
        }
      >
        <ul className="space-y-4">
          {faq.fields.map((f, i) => (
            <li key={f.id} className="space-y-2 rounded-xl border border-ink-700 p-3">
              <input
                disabled={disabled}
                className={inputCls}
                placeholder="Question"
                {...register(`faq.${i}.question`)}
              />
              <textarea
                disabled={disabled}
                className={`${inputCls} h-20 py-2`}
                placeholder="Answer"
                {...register(`faq.${i}.answer`)}
              />
              {!disabled && (
                <button
                  type="button"
                  className="text-xs text-rose-50/60 underline underline-offset-4 hover:text-danger"
                  onClick={() => faq.remove(i)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>
            Save store settings
          </Button>
        </div>
      )}
    </form>
  );
}

function StaffPanel() {
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const [invite, setInvite] = useState(null);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: '', email: '', role: 'staff' },
  });
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => api('/admin/staff'),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] });

  const add = useMutation({
    mutationFn: (v) => api('/admin/staff', { method: 'POST', body: v }),
    onSuccess: (r) => {
      refresh();
      reset();
      setInvite(
        r.temporaryPassword
          ? `Temporary password (shown once, dev only): ${r.temporaryPassword}`
          : 'Invite sent by email with a temporary password.'
      );
    },
    onError: (err) => toast.error(err.message),
  });
  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/admin/staff/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      toast.success('Saved. Logged.');
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Panel title="Staff and roles">
      <form
        onSubmit={handleSubmit((v) => add.mutate(v))}
        className="mb-6 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"
      >
        <input
          className={inputCls}
          placeholder="Name"
          aria-label="Name"
          {...register('name', { required: true })}
        />
        <input
          className={inputCls}
          type="email"
          placeholder="Email"
          aria-label="Email"
          {...register('email', { required: true })}
        />
        <select className={inputCls} aria-label="Role" {...register('role')}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
        <Button type="submit" loading={add.isPending}>
          Invite
        </Button>
      </form>
      {invite && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-rose-400/40 bg-rose-400/5 p-3 text-sm"
        >
          {invite}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-rose-50/60">Loading…</p>
      ) : (
        <ul className="divide-y divide-ink-700 text-sm">
          {staff.map((s) => (
            <li key={s._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-rose-50">
                  {s.name} {!s.isActive && <Tag tone="danger">disabled</Tag>}
                </p>
                <p className="text-xs text-rose-50/55">
                  {s.email} · last login {s.lastLoginAt ? formatDate(s.lastLoginAt) : 'never'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className={`${inputCls} w-32`}
                  value={s.role}
                  aria-label={`Role for ${s.name}`}
                  onChange={(e) => update.mutate({ id: s._id, body: { role: e.target.value } })}
                >
                  {['staff', 'admin', 'owner'].map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`text-xs underline underline-offset-4 ${s.isActive ? 'text-rose-50/60 hover:text-danger' : 'text-rose-200'}`}
                  onClick={() =>
                    s.isActive
                      ? ask(
                          `Disable ${s.name}? They will not be able to log in.`,
                          () => update.mutate({ id: s._id, body: { isActive: false } }),
                          { yes: 'Disable' }
                        )
                      : update.mutate({ id: s._id, body: { isActive: true } })
                  }
                >
                  {s.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </Panel>
  );
}

function ActivityPanel() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'activity', entity, page],
    queryFn: () => api('/admin/activity', { query: { entity, page, limit: 30 } }),
    placeholderData: (prev) => prev,
  });
  return (
    <Panel
      title="Activity log"
      action={
        <select
          className={`${inputCls} h-8 w-40 text-xs`}
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by area"
        >
          <option value="">All areas</option>
          {[
            'product',
            'order',
            'coupon',
            'delivery_zone',
            'settings',
            'staff',
            'category',
            'brand',
            'payment',
          ].map((x) => (
            <option key={x} value={x}>
              {x.replace('_', ' ')}
            </option>
          ))}
        </select>
      }
    >
      {isLoading && !data ? (
        <p className="text-sm text-rose-50/60">Loading…</p>
      ) : data?.items?.length ? (
        <ul className="divide-y divide-ink-700 text-sm">
          {data.items.map((a) => (
            <li key={a._id} className="py-2.5">
              <p className="text-rose-50">
                <span className="text-rose-200">{a.action}</span> · {a.entity}
                {a.entityId ? ` ${String(a.entityId).slice(-6)}` : ''}
              </p>
              <p className="text-xs text-rose-50/55">
                {formatDate(a.at)} · {a.actorEmail ?? 'system'} {a.ip ? `· ${a.ip}` : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nothing logged yet.</Empty>
      )}
      <Pager page={data?.page ?? 1} pages={data?.pages ?? 1} onChange={setPage} />
    </Panel>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const canEdit = RANK[user?.role] >= RANK.owner;
  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api('/admin/settings'),
  });
  return (
    <>
      <PageHeader
        title="Settings & staff"
        subtitle={
          canEdit
            ? 'Store details, policies and who can use the admin.'
            : 'Read only for your role. Only the owner can change these.'
        }
      />
      {isLoading ? (
        <p className="text-sm text-rose-50/60">Loading…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <StoreForm settings={settings} canEdit={canEdit} />
          </div>
          <div className="space-y-6">
            {canEdit && <StaffPanel />}
            <ActivityPanel />
          </div>
        </div>
      )}
    </>
  );
}
