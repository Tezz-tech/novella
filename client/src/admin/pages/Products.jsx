import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import {
  Panel,
  PageHeader,
  Tag,
  Pager,
  Empty,
  Field,
  inputCls,
  naira,
  useConfirm,
} from '../ui.jsx';

const RANK = { customer: 0, staff: 1, admin: 2, owner: 3 };
const SORTS = [
  ['updated', 'Recently updated'],
  ['name', 'Name'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['stock_asc', 'Stock: low first'],
];

function BulkPriceModal({ open, onClose, ids, onDone }) {
  const [preview, setPreview] = useState(null);
  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: { mode: 'percent', value: 10, field: 'price', round: 'nearest_100' },
  });
  const values = watch();
  const body = (v) => ({
    ids,
    mode: v.mode,
    value: Number(v.value),
    field: v.field,
    round: v.round,
  });

  const previewMutation = useMutation({
    mutationFn: (v) =>
      api('/admin/products/bulk-price', {
        method: 'PATCH',
        query: { dryRun: 'true' },
        body: body(v),
      }),
    onSuccess: (r) => setPreview(r),
    onError: (err) => toast.error(err.message),
  });
  const apply = useMutation({
    mutationFn: (v) => api('/admin/products/bulk-price', { method: 'PATCH', body: body(v) }),
    onSuccess: (r) => {
      toast.success(
        `Updated ${r.updatedVariants} price${r.updatedVariants === 1 ? '' : 's'} across ${r.updatedProducts} product(s). Logged.`
      );
      setPreview(null);
      reset();
      onDone();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        setPreview(null);
        onClose();
      }}
      label="Update prices"
    >
      <div className="max-h-[85vh] space-y-5 overflow-y-auto p-6">
        <h2 className="text-lg">Update prices</h2>
        <p className="text-sm text-rose-50/65">
          {ids.length ? `${ids.length} selected product(s)` : 'All active products'}. You will see a
          preview before anything changes.
        </p>
        <form
          onSubmit={handleSubmit((v) => previewMutation.mutate(v))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Change">
            <select className={inputCls} {...register('field')}>
              <option value="price">Price</option>
              <option value="compareAtPrice">Compare-at price</option>
            </select>
          </Field>
          <Field label="How">
            <select className={inputCls} {...register('mode')}>
              <option value="percent">± percent</option>
              <option value="fixed">± naira amount</option>
              <option value="set">Set to naira amount</option>
            </select>
          </Field>
          <Field label={values.mode === 'percent' ? 'Percent (negative lowers)' : 'Naira'}>
            <input
              className={inputCls}
              type="number"
              step="any"
              {...register('value', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Round to">
            <select className={inputCls} {...register('round')}>
              <option value="none">Exact</option>
              <option value="nearest_100">Nearest ₦100</option>
              <option value="nearest_1000">Nearest ₦1,000</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" loading={previewMutation.isPending}>
              Preview changes
            </Button>
          </div>
        </form>

        {preview && (
          <div className="space-y-4">
            <p className="text-sm text-rose-50/80">
              {preview.count} variant(s) will change
              {preview.count > 500 ? ' (first 500 shown)' : ''}.
            </p>
            <div className="max-h-72 overflow-auto rounded-xl border border-ink-700">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-ink-800 text-xs uppercase tracking-label text-rose-50/55">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th>Option</th>
                    <th className="text-right">Old</th>
                    <th className="px-3 text-right">New</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700">
                  {preview.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="text-rose-50/65">{r.label}</td>
                      <td className="text-right tabular-nums">
                        ₦{r.oldNaira.toLocaleString('en-NG')}
                      </td>
                      <td className="px-3 text-right tabular-nums text-rose-100">
                        ₦{r.newNaira.toLocaleString('en-NG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Back
              </Button>
              <Button
                disabled={!preview.count}
                loading={apply.isPending}
                onClick={handleSubmit((v) => apply.mutate(v))}
              >
                Apply {preview.count} change(s)
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Products() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = (RANK[user?.role] ?? 0) >= RANK.admin;
  const { ask, dialog } = useConfirm();
  const [selected, setSelected] = useState([]);
  const [priceOpen, setPriceOpen] = useState(false);
  const [q, setQ] = useState(params.get('q') ?? '');

  const query = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    sort: params.get('sort') ?? 'updated',
    page: Number(params.get('page') ?? 1),
    limit: 25,
  };
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'products', query],
    queryFn: () => api('/admin/products', { query }),
    placeholderData: (prev) => prev,
  });

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch))
      v === '' || v == null ? next.delete(k) : next.set(k, String(v));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'products'] });
  const setStatus = useMutation({
    mutationFn: ({ ids, status }) =>
      Promise.all(
        ids.map((id) => api(`/admin/products/${id}/status`, { method: 'PATCH', body: { status } }))
      ),
    onSuccess: (_r, vars) => {
      toast.success(`${vars.ids.length} product(s) set to ${vars.status}`);
      setSelected([]);
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOnPage = data?.items?.map((p) => p._id) ?? [];
  const allChecked = allOnPage.length > 0 && allOnPage.every((id) => selected.includes(id));

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Prices are in naira. Inline edits and bulk changes are logged."
        actions={
          <>
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={() => setPriceOpen(true)}>
                Update prices
              </Button>
            )}
            <Button size="sm" to="/admin/products/new">
              New product
            </Button>
          </>
        }
      />

      <Panel>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: q.trim() });
          }}
          className="mb-5 flex flex-wrap gap-3"
        >
          <input
            className={`${inputCls} max-w-xs`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, slug or brand"
            aria-label="Search products"
          />
          <select
            className={`${inputCls} w-44`}
            value={query.status}
            onChange={(e) => update({ status: e.target.value })}
            aria-label="Status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select
            className={`${inputCls} w-52`}
            value={query.sort}
            onChange={(e) => update({ sort: e.target.value })}
            aria-label="Sort"
          >
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        {selected.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-400/40 bg-rose-400/5 px-4 py-2.5 text-sm">
            <span>{selected.length} selected</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStatus.mutate({ ids: selected, status: 'active' })}
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStatus.mutate({ ids: selected, status: 'draft' })}
            >
              Set to draft
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() =>
                ask(
                  `Archive ${selected.length} product(s)? They will disappear from the store but keep their order history.`,
                  () => setStatus.mutate({ ids: selected, status: 'archived' }),
                  { yes: 'Archive' }
                )
              }
            >
              Archive
            </Button>
            {isAdmin && (
              <Button size="sm" variant="secondary" onClick={() => setPriceOpen(true)}>
                Change prices
              </Button>
            )}
            <button
              type="button"
              onClick={() => setSelected([])}
              className="ml-auto text-xs text-rose-200 underline underline-offset-4"
            >
              Clear
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error.message}
          </p>
        )}

        {isLoading && !data ? (
          <p className="py-10 text-center text-sm text-rose-50/60">Loading products…</p>
        ) : data?.items?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-label text-rose-50/50">
                <tr>
                  <th className="w-10 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all on this page"
                      className="accent-rose-400"
                      checked={allChecked}
                      onChange={() => setSelected(allChecked ? [] : allOnPage)}
                    />
                  </th>
                  <th className="font-medium">Product</th>
                  <th className="font-medium">Category</th>
                  <th className="font-medium">Condition</th>
                  <th className="font-medium">Price</th>
                  <th className="font-medium">Stock</th>
                  <th className="font-medium">Status</th>
                  <th className="font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {data.items.map((p) => (
                  <tr key={p._id} className="hover:bg-rose-400/5">
                    <td className="py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.name}`}
                        className="accent-rose-400"
                        checked={selected.includes(p._id)}
                        onChange={() => toggle(p._id)}
                      />
                    </td>
                    <td className="flex items-center gap-3 py-3">
                      <img
                        src={p.images?.[0]?.url || '/placeholders/product.svg'}
                        alt=""
                        className="h-11 w-11 rounded-lg bg-ink-800 object-contain p-1"
                        loading="lazy"
                      />
                      <div>
                        <Link
                          to={`/admin/products/${p._id}`}
                          className="text-rose-100 hover:text-rose-200"
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs text-rose-50/50">
                          {p.brand?.name} ·{' '}
                          {p.type === 'combo' ? 'Combo' : `${p.variants?.length} variant(s)`}
                        </p>
                      </div>
                    </td>
                    <td className="text-rose-50/70">{p.category?.name}</td>
                    <td className="text-rose-50/70">{p.condition.replace(/_/g, ' ')}</td>
                    <td className="tabular-nums">
                      {p.priceMin === p.priceMax
                        ? naira(p.priceMin)
                        : `${naira(p.priceMin)} – ${naira(p.priceMax)}`}
                    </td>
                    <td
                      className={`tabular-nums ${p.totalStock === 0 ? 'text-danger' : p.totalStock <= 3 ? 'text-spark-400' : ''}`}
                    >
                      {p.totalStock}
                    </td>
                    <td>
                      <Tag
                        tone={
                          p.status === 'active'
                            ? 'success'
                            : p.status === 'draft'
                              ? 'warn'
                              : 'neutral'
                        }
                      >
                        {p.status}
                      </Tag>
                    </td>
                    <td className="text-xs text-rose-50/55">
                      {new Date(p.updatedAt).toLocaleDateString('en-NG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No products match. Try another search, or create one.</Empty>
        )}

        <Pager
          page={data?.page ?? 1}
          pages={data?.pages ?? 1}
          onChange={(p) => update({ page: p })}
        />
      </Panel>

      <BulkPriceModal
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        ids={selected}
        onDone={() => {
          setSelected([]);
          refresh();
        }}
      />
      {dialog}
    </>
  );
}
