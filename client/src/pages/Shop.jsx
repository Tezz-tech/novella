import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '../lib/queries.js';
import Seo from '../components/seo/Seo.jsx';
import ProductGrid from '../components/product/ProductGrid.jsx';
import Filters, { PRICE_RANGES } from '../components/shop/Filters.jsx';
import Button from '../components/ui/Button.jsx';
import { Sheet } from '../components/ui/Overlay.jsx';
import { Select } from '../components/ui/Field.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'best_selling', label: 'Best selling' },
];

const readFilters = (sp, fixed) => ({
  q: sp.get('q') ?? '',
  category: fixed.category ?? sp.get('category') ?? '',
  brand: sp.get('brand') ?? '',
  condition: (sp.get('condition') ?? '').split(',').filter(Boolean),
  storage: sp.get('storage') ?? '',
  inStock: sp.get('inStock') === 'true',
  price: sp.get('price') ?? 'any',
  tag: sp.get('tag') ?? '',
  sort: sp.get('sort') ?? (sp.get('q') ? 'relevance' : 'newest'),
  page: Math.max(1, Number(sp.get('page') ?? 1) || 1),
});

/**
 * Shop, category, combos and deals share this page. `fixed` pins the category, product type
 * or deal flag. Every filter lives in the URL, so results can be shared and bookmarked.
 */
export default function Shop({ title, eyebrow, description, fixed = {}, path = '/shop' }) {
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState(false);
  const values = useMemo(() => readFilters(params, fixed), [params, fixed]);
  const range = PRICE_RANGES.find((r) => r.id === values.price) ?? PRICE_RANGES[0];

  const query = {
    q: values.q || undefined,
    category: values.category || undefined,
    brand: values.brand || undefined,
    condition: values.condition.join(',') || undefined,
    storage: values.storage || undefined,
    tag: values.tag || fixed.tag || undefined,
    type: fixed.type || undefined,
    deal: fixed.deal ? 'true' : undefined,
    inStock: values.inStock ? 'true' : undefined,
    minPrice: range.min,
    maxPrice: range.max,
    sort: values.sort,
    page: values.page,
    limit: 24,
  };

  const { data, isLoading, isError, error, isPlaceholderData } = useProducts(query);

  const update = (patch) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          const empty = v === '' || v === false || (Array.isArray(v) && v.length === 0);
          if (empty) next.delete(k);
          else next.set(k, Array.isArray(v) ? v.join(',') : v === true ? 'true' : String(v));
        }
        if (!('page' in patch)) next.delete('page');
        return next;
      },
      { preventScrollReset: false }
    );
  };

  const clear = () => {
    const keep = new URLSearchParams();
    if (values.q) keep.set('q', values.q);
    setParams(keep);
  };

  const pages = data?.pages ?? 1;
  const heading = fixed.title ?? (values.q ? `Results for “${values.q}”` : (title ?? 'Shop'));

  const filterPanel = (
    <Filters
      values={values}
      facets={data?.facets}
      onChange={update}
      onClear={clear}
      showCategory={!fixed.category}
    />
  );

  return (
    <>
      <Seo title={heading} path={path} description={description} />
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 md:px-8">
        <Reveal className="mb-8 space-y-2">
          {eyebrow && <p className="text-xs uppercase tracking-label text-rose-300">{eyebrow}</p>}
          <h1 className="text-4xl md:text-5xl">{heading}</h1>
          {description && <p className="max-w-2xl text-rose-50/65">{description}</p>}
        </Reveal>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-ink-700 py-3">
          <p className="text-sm text-rose-50/65" aria-live="polite">
            {data ? `${data.total} ${data.total === 1 ? 'product' : 'products'}` : ' '}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="lg:hidden"
              onClick={() => setSheet(true)}
            >
              Filters
            </Button>
            <div className="w-56">
              <Select
                label=""
                aria-label="Sort products"
                value={values.sort}
                onChange={(e) => update({ sort: e.target.value })}
              >
                {SORTS.concat(values.q ? [{ value: 'relevance', label: 'Relevance' }] : []).map(
                  (s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  )
                )}
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            {filterPanel}
          </aside>

          <div>
            {isError ? (
              <p role="alert" className="rounded-card border border-danger/50 p-6 text-danger">
                We could not load products. {error.message}
              </p>
            ) : (
              <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : ''}>
                <ProductGrid
                  products={data?.items}
                  loading={isLoading}
                  emptyTitle="No products match these filters"
                />
              </div>
            )}

            {pages > 1 && (
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={values.page <= 1}
                  onClick={() => update({ page: values.page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-sm tabular-nums text-rose-50/70">
                  Page {values.page} of {pages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={values.page >= pages}
                  onClick={() => update({ page: values.page + 1 })}
                >
                  Next
                </Button>
              </nav>
            )}
          </div>
        </div>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} label="Filter products">
        <div className="overflow-y-auto p-6">
          {filterPanel}
          <Button className="mt-8 w-full" onClick={() => setSheet(false)}>
            Show {data?.total ?? ''} results
          </Button>
        </div>
      </Sheet>
    </>
  );
}
