import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { CONDITION_LABELS } from '../../lib/format.js';
import Button from '../../components/ui/Button.jsx';
import { Panel, PageHeader, Field, inputCls, naira, Tag, useConfirm, nairaInput } from '../ui.jsx';
import { uploadAdminImage, buildVariantGrid } from '../upload.js';

const TAGS = [
  ['new_arrival', 'New arrival'],
  ['best_seller', 'Best seller'],
  ['hot_deal', 'Hot deal'],
  ['featured', 'Featured'],
];
const slugify = (s) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
const draftKey = (id) => `novelle-admin-draft-${id ?? 'new'}`;

/** Converts the server shape (kobo) into the form shape (naira). */
function toForm(p) {
  return {
    name: p.name ?? '',
    slug: p.slug ?? '',
    type: p.type ?? 'single',
    brand: p.brand?._id ?? p.brand ?? '',
    category: p.category?._id ?? p.category ?? '',
    condition: p.condition ?? 'brand_new',
    warranty: p.warranty ?? '6 months store warranty',
    tags: p.tags ?? [],
    status: p.status ?? 'draft',
    shortDescription: p.shortDescription ?? '',
    description: p.description ?? '',
    specs: p.specs?.length ? p.specs : [],
    images: p.images?.length ? p.images : [],
    options: p.options?.length
      ? p.options.map((o) => ({ name: o.name, values: o.values.join(', ') }))
      : [],
    variants: (p.variants ?? []).map((v) => ({
      _id: v._id,
      sku: v.sku ?? '',
      optionValues: v.optionValues ?? {},
      price: nairaInput(v.price),
      compareAtPrice: nairaInput(v.compareAtPrice),
      stock: v.stock ?? 0,
      isActive: v.isActive !== false,
    })),
    comboItems: (p.comboItems ?? []).map((c) => ({
      product: c.product?._id ?? c.product,
      variant: c.variant,
      qty: c.qty ?? 1,
      label: c.label ?? '',
    })),
    seoTitle: p.seo?.title ?? '',
    seoDescription: p.seo?.description ?? '',
    dealEndsAt: p.dealEndsAt ? p.dealEndsAt.slice(0, 16) : '',
  };
}

/** Converts the form back to the API shape. Prices stay in naira; the server converts them. */
function toPayload(v) {
  const optsOk = v.options.filter((o) => o.name && o.values?.trim());
  return {
    name: v.name,
    slug: v.slug || slugify(v.name),
    type: v.type,
    brand: v.brand,
    category: v.category,
    condition: v.condition,
    warranty: v.warranty,
    tags: v.tags,
    status: v.status,
    shortDescription: v.shortDescription,
    description: v.description,
    specs: v.specs.filter((s) => s.label && s.value),
    images: v.images.map((i) => ({ url: i.url, publicId: i.publicId ?? null, alt: i.alt ?? '' })),
    options: optsOk.map((o) => ({
      name: o.name,
      values: o.values
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    })),
    variants: v.variants.map((row) => ({
      ...(row._id ? { id: row._id } : {}),
      sku: row.sku || undefined,
      optionValues: row.optionValues,
      price: Number(row.price || 0),
      compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : null,
      stock: Number(row.stock || 0),
      isActive: row.isActive !== false,
    })),
    comboItems:
      v.type === 'combo'
        ? v.comboItems.map((c) => ({
            product: c.product,
            variant: c.variant,
            qty: Number(c.qty) || 1,
          }))
        : [],
    seo: { title: v.seoTitle || undefined, description: v.seoDescription || undefined },
    dealEndsAt: v.dealEndsAt ? new Date(v.dealEndsAt).toISOString() : null,
  };
}

function ComboBuilder({ form }) {
  const { control, register, watch } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'comboItems' });
  const [search, setSearch] = useState('');
  const { data: found } = useQuery({
    queryKey: ['admin', 'combo-search', search],
    queryFn: () => api('/admin/products', { query: { q: search, limit: 8 } }),
    enabled: search.trim().length >= 2,
  });
  const items = watch('comboItems');

  return (
    <Panel title="Combo items">
      <div className="space-y-4">
        <Field label="Find a product to add">
          <input
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type at least 2 letters"
          />
        </Field>
        {found?.items?.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {found.items.map((p) => (
              <li key={p._id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-ink-700 px-3 py-2 text-left text-sm hover:border-rose-400/60"
                  onClick={() => {
                    const variant = p.variants?.[0];
                    append({
                      product: p._id,
                      variant: variant?.id ?? variant?._id ?? '',
                      qty: 1,
                      label: `${p.name}${variant ? ` · ${Object.values(variant.optionValues ?? {}).join(' · ')}` : ''}`,
                    });
                    setSearch('');
                  }}
                >
                  {p.name} <span className="text-xs text-rose-50/50">{naira(p.priceMin)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <ul className="divide-y divide-ink-700 rounded-xl border border-ink-700">
          {fields.map((f, i) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className="flex-1 text-rose-50/85">{items?.[i]?.label || 'Item'}</span>
              <label className="flex items-center gap-2 text-xs text-rose-50/70">
                Qty
                <input
                  type="number"
                  min="1"
                  className={`${inputCls} w-20`}
                  {...register(`comboItems.${i}.qty`)}
                />
              </label>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-rose-50/60 underline underline-offset-4 hover:text-danger"
              >
                Remove
              </button>
            </li>
          ))}
          {fields.length === 0 && <li className="p-3 text-sm text-rose-50/55">No items yet.</li>}
        </ul>
        <p className="text-xs text-rose-50/60">
          Children are bought from their own stock. The bundle price is set in the variant row
          below.
        </p>
      </div>
    </Panel>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [draftFound, setDraftFound] = useState(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => api(`/admin/products/${id}`),
    enabled: !isNew,
  });
  const { data: brands = [] } = useQuery({
    queryKey: ['admin', 'brands'],
    queryFn: () => api('/admin/brands'),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api('/admin/categories'),
  });

  const form = useForm({ defaultValues: toForm({}) });
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { isDirty, errors },
  } = form;
  const variants = useFieldArray({ control, name: 'variants' });
  const specs = useFieldArray({ control, name: 'specs' });
  const images = useFieldArray({ control, name: 'images' });
  const options = useFieldArray({ control, name: 'options' });

  // Load the product, or offer to restore an autosaved draft.
  useEffect(() => {
    if (isNew) {
      try {
        const raw = localStorage.getItem(draftKey(null));
        if (raw) setDraftFound(JSON.parse(raw));
      } catch {
        /* ignore a broken draft */
      }
    } else if (product) {
      reset(toForm(product));
    }
  }, [product, isNew, reset]);

  // Autosave every 10 seconds while there are unsaved changes.
  useEffect(() => {
    const t = setInterval(() => {
      if (!form.formState.isDirty) return;
      try {
        localStorage.setItem(
          draftKey(id),
          JSON.stringify({ savedAt: Date.now(), values: getValues() })
        );
      } catch {
        /* storage blocked: no autosave */
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [form, getValues, id]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const warn = (e) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [form]);

  const name = watch('name');
  const slug = watch('slug');
  const type = watch('type');
  const status = watch('status');
  const imgs = watch('images');
  const firstVariant = watch('variants.0');
  const shortDesc = watch('shortDescription');
  const seoTitle = watch('seoTitle');
  const seoDesc = watch('seoDescription');
  const condition = watch('condition');

  const save = useMutation({
    mutationFn: (v) =>
      isNew
        ? api('/admin/products', { method: 'POST', body: toPayload(v) })
        : api(`/admin/products/${id}`, { method: 'PUT', body: toPayload(v) }),
    onSuccess: (p) => {
      try {
        localStorage.removeItem(draftKey(id));
      } catch {
        /* ignore */
      }
      toast.success(isNew ? 'Product created' : 'Product saved');
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      reset(toForm(p));
      if (isNew) navigate(`/admin/products/${p._id}`, { replace: true });
    },
    onError: (err) => toast.error(err.message),
  });

  const onUpload = async (files) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const up = await uploadAdminImage(file);
        images.append({ url: up.url, publicId: up.publicId, alt: name || '' });
      }
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const regenerate = () => {
    const current = getValues('variants');
    const defaults = { price: Number(current?.[0]?.price || 0) };
    const next = buildVariantGrid(getValues('options'), current, defaults);
    setValue(
      'variants',
      next.map((v) => ({
        ...v,
        price: v.price,
        compareAtPrice: v.compareAtPrice ?? '',
        stock: v.stock ?? 0,
      })),
      { shouldDirty: true }
    );
    toast.info(
      `${next.length} variant row(s) generated. Existing rows kept their prices and stock.`
    );
  };

  if (!isNew && isLoading)
    return <p className="py-16 text-center text-rose-50/60">Loading product…</p>;

  const cheapest = Math.min(
    ...variants.fields.map((_, i) => Number(getValues(`variants.${i}.price`)) || 0)
  );
  const preview = {
    name,
    slug,
    condition,
    price: firstVariant?.price,
    image: imgs?.[0]?.url,
    alt: imgs?.[0]?.alt,
  };
  const titleLen = (seoTitle || name || '').length;
  const descLen = (seoDesc || shortDesc || '').length;

  return (
    <>
      <PageHeader
        title={isNew ? 'New product' : name || 'Edit product'}
        subtitle={
          isNew ? 'Fill in the basics, add photos and prices, then publish.' : `Slug: ${slug}`
        }
        actions={
          <>
            <Link
              to="/admin/products"
              className="text-sm text-rose-200 underline underline-offset-4"
            >
              Back to products
            </Link>
            <Button
              onClick={handleSubmit(
                (v) => save.mutate(v),
                () => toast.error('Check the highlighted fields')
              )}
              loading={save.isPending}
              disabled={!isDirty && !isNew}
            >
              Save
            </Button>
          </>
        }
      />

      {draftFound && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/40 bg-rose-400/5 p-4 text-sm"
        >
          <span>
            You have an unsaved draft from {new Date(draftFound.savedAt).toLocaleString('en-NG')}.
          </span>
          <Button
            size="sm"
            onClick={() => {
              reset(draftFound.values);
              setDraftFound(null);
              toast.info('Draft restored');
            }}
          >
            Restore draft
          </Button>
          <button
            type="button"
            className="text-xs text-rose-200 underline underline-offset-4"
            onClick={() => {
              localStorage.removeItem(draftKey(null));
              setDraftFound(null);
            }}
          >
            Discard
          </button>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Basics">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <input
                  className={inputCls}
                  {...register('name', {
                    required: 'Enter a name',
                    onChange: (e) => {
                      if (!getValues('slug')) setValue('slug', slugify(e.target.value));
                    },
                  })}
                />
                {errors.name && <span className="text-danger">{errors.name.message}</span>}
              </Field>
              <Field label="Slug (URL)">
                <input className={inputCls} {...register('slug')} />
              </Field>
              <Field label="Type">
                <select className={inputCls} {...register('type')}>
                  <option value="single">Single product</option>
                  <option value="combo">Combo (bundle)</option>
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} {...register('status')}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="active">Active (on the store)</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
              <Field label="Brand">
                <select className={inputCls} {...register('brand', { required: true })}>
                  <option value="">Choose a brand</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Category">
                <select className={inputCls} {...register('category', { required: true })}>
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Condition">
                <select className={inputCls} {...register('condition')}>
                  {Object.entries(CONDITION_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Warranty">
                <input className={inputCls} {...register('warranty')} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {TAGS.map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 text-rose-50/85">
                  <input
                    type="checkbox"
                    value={v}
                    className="accent-rose-400"
                    {...register('tags')}
                  />
                  {l}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4">
              <Field label={`Short description (${shortDesc?.length ?? 0}/240)`}>
                <input className={inputCls} maxLength={240} {...register('shortDescription')} />
              </Field>
              <Field label="Full description">
                <textarea className={`${inputCls} h-36 py-2`} {...register('description')} />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Photos"
            action={
              <span className="text-xs text-rose-50/55">
                First photo is the cover · JPG, PNG or WebP, 5 MB max
              </span>
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploading || imgs?.length >= 8}
                onChange={(e) => onUpload(e.target.files)}
                className="text-sm text-rose-50/80 file:mr-3 file:rounded-pill file:border-0 file:bg-rose-400/20 file:px-4 file:py-2 file:text-rose-50"
                aria-label="Upload product photos"
              />
              {uploading && <span className="text-xs text-rose-50/60">Uploading…</span>}
            </div>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.fields.map((f, i) => (
                <li key={f.id} className="space-y-2 rounded-xl border border-ink-700 p-3">
                  <img
                    src={imgs?.[i]?.url || '/placeholders/product.svg'}
                    alt={imgs?.[i]?.alt || ''}
                    className="aspect-square w-full rounded-lg bg-ink-800 object-contain"
                  />
                  <input
                    className={inputCls}
                    placeholder="Alt text (describe the photo)"
                    {...register(`images.${i}.alt`)}
                  />
                  <div className="flex flex-wrap gap-3 text-xs">
                    {i === 0 ? (
                      <Tag tone="pink">Cover</Tag>
                    ) : (
                      <button
                        type="button"
                        className="text-rose-200 underline underline-offset-4"
                        onClick={() => images.move(i, 0)}
                      >
                        Make cover
                      </button>
                    )}
                    {i > 0 && (
                      <button
                        type="button"
                        className="text-rose-50/60 underline underline-offset-4"
                        onClick={() => images.move(i, i - 1)}
                      >
                        Move up
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-rose-50/60 underline underline-offset-4 hover:text-danger"
                      onClick={() => images.remove(i)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {imgs?.length === 0 && (
              <p className="mt-4 text-sm text-rose-50/55">
                No photos yet. The store shows a neutral placeholder until you add one.
              </p>
            )}
          </Panel>

          <Panel
            title="Specifications"
            action={
              <button
                type="button"
                className="text-xs text-rose-200 underline underline-offset-4"
                onClick={() => specs.append({ label: '', value: '' })}
              >
                Add row
              </button>
            }
          >
            <ul className="space-y-3">
              {specs.fields.map((f, i) => (
                <li key={f.id} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                  <input
                    className={inputCls}
                    placeholder="Label, e.g. Display"
                    {...register(`specs.${i}.label`)}
                  />
                  <input
                    className={inputCls}
                    placeholder="Value, e.g. 6.1-inch OLED"
                    {...register(`specs.${i}.value`)}
                  />
                  <button
                    type="button"
                    onClick={() => specs.remove(i)}
                    className="text-xs text-rose-50/60 underline underline-offset-4 hover:text-danger"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {specs.fields.length === 0 && (
              <p className="text-sm text-rose-50/55">
                Add the details shoppers compare: storage, screen, battery.
              </p>
            )}
          </Panel>

          {type === 'combo' ? (
            <ComboBuilder form={form} />
          ) : (
            <Panel title="Options">
              <div className="space-y-3">
                {options.fields.map((f, i) => (
                  <div key={f.id} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                    <input
                      className={inputCls}
                      placeholder="Option, e.g. Storage"
                      {...register(`options.${i}.name`)}
                    />
                    <input
                      className={inputCls}
                      placeholder="Values, comma separated: 128GB, 256GB"
                      {...register(`options.${i}.values`)}
                    />
                    <button
                      type="button"
                      onClick={() => options.remove(i)}
                      className="text-xs text-rose-50/60 underline underline-offset-4 hover:text-danger"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => options.append({ name: '', values: '' })}
                  >
                    Add option
                  </Button>
                  <Button variant="secondary" size="sm" onClick={regenerate}>
                    Generate variant rows
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          <Panel
            title={type === 'combo' ? 'Bundle price and stock' : 'Variants: price and stock'}
            action={
              type === 'single' && (
                <button
                  type="button"
                  className="text-xs text-rose-200 underline underline-offset-4"
                  onClick={() =>
                    variants.append({
                      sku: '',
                      optionValues: {},
                      price: '',
                      compareAtPrice: '',
                      stock: 0,
                      isActive: true,
                    })
                  }
                >
                  Add row
                </button>
              )
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-label text-rose-50/50">
                  <tr>
                    <th className="py-2 font-medium">Option</th>
                    <th className="font-medium">Price (₦)</th>
                    <th className="font-medium">Was (₦)</th>
                    <th className="font-medium">Stock</th>
                    <th className="font-medium">SKU</th>
                    <th className="font-medium">On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700">
                  {variants.fields.map((f, i) => (
                    <tr key={f.id}>
                      <td className="py-2 text-rose-50/80">
                        {Object.values(f.optionValues ?? {}).join(' · ') || 'Standard'}
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className={`${inputCls} w-32`}
                          {...register(`variants.${i}.price`, { required: true })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className={`${inputCls} w-32`}
                          {...register(`variants.${i}.compareAtPrice`)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className={`${inputCls} w-24`}
                          {...register(`variants.${i}.stock`)}
                        />
                      </td>
                      <td>
                        <input className={`${inputCls} w-40`} {...register(`variants.${i}.sku`)} />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="accent-rose-400"
                          {...register(`variants.${i}.isActive`)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {variants.fields.length === 0 && (
              <p className="mt-3 text-sm text-rose-50/55">Add at least one row with a price.</p>
            )}
            {Number.isFinite(cheapest) && (
              <p className="mt-3 text-xs text-rose-50/55">Lowest price: {naira(cheapest * 100)}</p>
            )}
          </Panel>

          <Panel title="Search engine">
            <div className="grid gap-4">
              <Field label={`Title (${titleLen}/70)`}>
                <input
                  className={inputCls}
                  maxLength={70}
                  {...register('seoTitle')}
                  placeholder={name}
                />
              </Field>
              <Field label={`Description (${descLen}/160)`}>
                <input
                  className={inputCls}
                  maxLength={160}
                  {...register('seoDescription')}
                  placeholder={shortDesc}
                />
              </Field>
              <Field label="Hot deal ends (optional)">
                <input type="datetime-local" className={inputCls} {...register('dealEndsAt')} />
              </Field>
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Live preview">
            <div className="bg-glow-radial overflow-hidden rounded-2xl border border-ink-700 bg-ink-800 p-4">
              <img
                src={preview.image || '/placeholders/product.svg'}
                alt={preview.alt || ''}
                className="mx-auto aspect-square w-full object-contain"
              />
              <p className="mt-3 text-[11px] uppercase tracking-label text-rose-300">
                {condition ? CONDITION_LABELS[condition] : ''}
              </p>
              <p className="mt-1 text-base text-rose-50">{preview.name || 'Product name'}</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {preview.price ? naira(Number(preview.price) * 100) : '₦0'}
              </p>
            </div>
            <p className="mt-3 text-xs text-rose-50/55">
              Storefront card preview. Brand colours and metal accents match the store.
            </p>
          </Panel>

          <Panel title="Publish">
            <p className="text-sm text-rose-50/75">
              Current status: <Tag tone={status === 'active' ? 'success' : 'warn'}>{status}</Tag>
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Button onClick={handleSubmit((v) => save.mutate(v))} loading={save.isPending}>
                Save changes
              </Button>
              {!isNew && status !== 'archived' && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    ask(
                      `Archive ${name}? It will disappear from the store but keep its order history.`,
                      () => save.mutate({ ...getValues(), status: 'archived' }),
                      { yes: 'Archive' }
                    )
                  }
                >
                  Archive product
                </Button>
              )}
            </div>
          </Panel>
        </aside>
      </form>
      {dialog}
    </>
  );
}
