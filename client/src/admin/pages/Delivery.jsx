import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
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

const RANK = { customer: 0, staff: 1, admin: 2, owner: 3 };

function ZoneForm({ value, onClose, onSaved }) {
  const { register, handleSubmit } = useForm({
    values: value?._id
      ? {
          state: value.state,
          city: value.city,
          fee: nairaInput(value.fee),
          etaText: value.etaText,
          isActive: value.isActive,
        }
      : { state: '', city: '*', fee: '', etaText: '1–3 days', isActive: true },
  });
  const mutation = useMutation({
    mutationFn: (v) => {
      const body = { ...v, fee: Number(v.fee) };
      return value?._id
        ? api(`/admin/delivery-zones/${value._id}`, { method: 'PUT', body })
        : api('/admin/delivery-zones', { method: 'POST', body });
    },
    onSuccess: () => {
      toast.success('Zone saved');
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <Modal open={value !== null} onClose={onClose} label="Delivery zone">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 p-6">
        <h2 className="text-lg">{value?._id ? 'Edit zone' : 'New zone'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="State">
            <input className={inputCls} {...register('state', { required: true })} />
          </Field>
          <Field label="City or LGA (* for whole state)">
            <input className={inputCls} {...register('city')} />
          </Field>
          <Field label="Fee (₦)">
            <input
              type="number"
              step="any"
              min="0"
              className={inputCls}
              {...register('fee', { required: true })}
            />
          </Field>
          <Field label="Delivery time">
            <input className={inputCls} {...register('etaText')} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-rose-400" {...register('isActive')} />
          Accepting orders here
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Save zone
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BulkFeeModal({ open, onClose, zones, onDone }) {
  const [picked, setPicked] = useState([]);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { feeNaira: '', etaText: '' },
  });
  const states = [...new Set(zones.map((z) => z.state))].sort();
  const mutation = useMutation({
    mutationFn: (v) =>
      api('/admin/delivery-zones/bulk-fee', {
        method: 'POST',
        body: { states: picked, feeNaira: Number(v.feeNaira), etaText: v.etaText || undefined },
      }),
    onSuccess: (r) => {
      toast.success(`Fee set for ${r.updated} state(s). Logged.`);
      reset();
      setPicked([]);
      onDone();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <Modal open={open} onClose={onClose} label="Set fee for many states">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 p-6">
        <h2 className="text-lg">Set one fee for many states</h2>
        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-ink-700 p-3 text-sm sm:grid-cols-3">
          {states.map((s) => (
            <label key={s} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-rose-400"
                checked={picked.includes(s)}
                onChange={() =>
                  setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
                }
              />
              {s}
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fee (₦)">
            <input
              type="number"
              step="any"
              min="0"
              className={inputCls}
              {...register('feeNaira', { required: true })}
            />
          </Field>
          <Field label="Delivery time (optional)">
            <input className={inputCls} {...register('etaText')} />
          </Field>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={picked.length === 0} loading={mutation.isPending}>
            Set fee for {picked.length} state(s)
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StoreTerms({ settings, canEdit }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    values: {
      freeDeliveryThresholdNaira: settings ? nairaInput(settings.freeDeliveryThreshold) : '',
      pickupAddress: settings?.pickupAddress ?? '',
    },
  });
  const save = useMutation({
    mutationFn: (v) =>
      api('/admin/settings', {
        method: 'PUT',
        body: {
          freeDeliveryThresholdNaira: Number(v.freeDeliveryThresholdNaira || 0),
          pickupAddress: v.pickupAddress,
        },
      }),
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <Panel title="Free delivery and pickup">
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 md:grid-cols-2">
        <Field label="Free delivery from (₦, 0 = off)">
          <input
            type="number"
            step="any"
            min="0"
            disabled={!canEdit}
            className={inputCls}
            {...register('freeDeliveryThresholdNaira')}
          />
        </Field>
        <Field label="Pickup address">
          <input disabled={!canEdit} className={inputCls} {...register('pickupAddress')} />
        </Field>
        <div className="md:col-span-2 flex items-center justify-between gap-3">
          <p className="text-xs text-rose-50/55">
            {canEdit ? 'Shown at checkout for pickup orders.' : 'Only the owner can change these.'}
          </p>
          {canEdit && (
            <Button type="submit" loading={save.isPending}>
              Save
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}

export default function Delivery() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEdit = RANK[user?.role] >= RANK.owner;
  const { ask, dialog } = useConfirm();
  const [editing, setEditing] = useState(null);
  const [bulk, setBulk] = useState(false);
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['admin', 'zones'],
    queryFn: () => api('/admin/delivery-zones'),
  });
  const { data: settings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api('/admin/settings'),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'zones'] });
  const remove = useMutation({
    mutationFn: (id) => api(`/admin/delivery-zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Zone removed');
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <PageHeader
        title="Delivery"
        subtitle="What delivery costs in each state, and how long it takes. Fees are in naira."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setBulk(true)}>
              Set fee for many states
            </Button>
            <Button size="sm" onClick={() => setEditing({})}>
              Add zone
            </Button>
          </>
        }
      />
      <div className="space-y-6">
        <StoreTerms settings={settings} canEdit={canEdit} />
        <Panel title={`Zones (${zones.length})`}>
          {isLoading ? (
            <p className="py-6 text-sm text-rose-50/60">Loading…</p>
          ) : zones.length === 0 ? (
            <Empty>No zones yet. Add one per state.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-label text-rose-50/50">
                  <tr>
                    <th className="py-2 font-medium">State</th>
                    <th className="font-medium">Area</th>
                    <th className="font-medium">Fee</th>
                    <th className="font-medium">Time</th>
                    <th className="font-medium">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700">
                  {zones.map((z) => (
                    <tr key={z._id}>
                      <td className="py-2.5">{z.state}</td>
                      <td className="text-rose-50/65">{z.city === '*' ? 'Whole state' : z.city}</td>
                      <td className="tabular-nums">{naira(z.fee)}</td>
                      <td className="text-rose-50/65">{z.etaText}</td>
                      <td>
                        <Tag tone={z.isActive ? 'success' : 'neutral'}>
                          {z.isActive ? 'open' : 'closed'}
                        </Tag>
                      </td>
                      <td className="space-x-3 text-right text-xs">
                        <button
                          type="button"
                          className="text-rose-200 underline underline-offset-4"
                          onClick={() => setEditing(z)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-rose-50/60 underline underline-offset-4 hover:text-danger"
                          onClick={() =>
                            ask(
                              `Remove the delivery zone for ${z.state}${z.city !== '*' ? ` (${z.city})` : ''}?`,
                              () => remove.mutate(z._id),
                              { yes: 'Remove' }
                            )
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
      <ZoneForm value={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      <BulkFeeModal open={bulk} onClose={() => setBulk(false)} zones={zones} onDone={refresh} />
      {dialog}
    </>
  );
}
