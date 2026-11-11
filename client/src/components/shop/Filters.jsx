import { CONDITION_LABELS, formatPrice } from '../../lib/format.js';
import { Divider } from '../ui/display.jsx';

export const PRICE_RANGES = [
  { id: 'any', label: 'Any price' },
  { id: 'under-100k', label: 'Under ₦100k', max: 10_000_000 },
  { id: '100k-300k', label: '₦100k – ₦300k', min: 10_000_000, max: 30_000_000 },
  { id: '300k-600k', label: '₦300k – ₦600k', min: 30_000_000, max: 60_000_000 },
  { id: 'over-600k', label: '₦600k and above', min: 60_000_000 },
];

function Group({ title, children }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold uppercase tracking-label text-rose-300">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Check({ name, value, checked, onChange, children, count }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-rose-50/85 hover:text-rose-50">
      <span className="flex items-center gap-2.5">
        <input
          type="checkbox"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 accent-rose-400"
        />
        {children}
      </span>
      {count != null && <span className="text-xs tabular-nums text-rose-50/50">{count}</span>}
    </label>
  );
}

function Radio({ name, value, checked, onChange, children, count }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-rose-50/85 hover:text-rose-50">
      <span className="flex items-center gap-2.5">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={() => onChange(value)}
          className="h-4 w-4 accent-rose-400"
        />
        {children}
      </span>
      {count != null && <span className="text-xs tabular-nums text-rose-50/50">{count}</span>}
    </label>
  );
}

/**
 * Filter controls. All state lives in the URL (see Shop). Facet counts come from the API so the
 * numbers always match the current results.
 */
export default function Filters({ values, facets, onChange, onClear, showCategory = true }) {
  const toggleCondition = (c) => {
    const set = new Set(values.condition);
    set.has(c) ? set.delete(c) : set.add(c);
    onChange({ condition: [...set] });
  };
  const condCount = (c) => facets?.conditions?.find((x) => x.value === c)?.count;
  const activeCount =
    (values.brand ? 1 : 0) +
    (values.condition.length ? 1 : 0) +
    (values.storage ? 1 : 0) +
    (values.inStock ? 1 : 0) +
    (values.price !== 'any' ? 1 : 0) +
    (showCategory && values.category ? 1 : 0);

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <p className="text-sm text-rose-50/70">Filters {activeCount ? `(${activeCount})` : ''}</p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-rose-200 underline underline-offset-4"
          >
            Clear all
          </button>
        )}
      </div>

      {showCategory && facets?.categories?.length > 0 && (
        <Group title="Category">
          <Radio
            name="category"
            value=""
            checked={!values.category}
            onChange={() => onChange({ category: '' })}
          >
            All categories
          </Radio>
          {facets.categories.map((c) => (
            <Radio
              key={c.slug}
              name="category"
              value={c.slug}
              checked={values.category === c.slug}
              onChange={(v) => onChange({ category: v })}
              count={c.count}
            >
              {c.name}
            </Radio>
          ))}
        </Group>
      )}

      <Divider />

      {facets?.brands?.length > 0 && (
        <Group title="Brand">
          <Radio
            name="brand"
            value=""
            checked={!values.brand}
            onChange={() => onChange({ brand: '' })}
          >
            All brands
          </Radio>
          {facets.brands.map((b) => (
            <Radio
              key={b.slug}
              name="brand"
              value={b.slug}
              checked={values.brand === b.slug}
              onChange={(v) => onChange({ brand: v })}
              count={b.count}
            >
              {b.name}
            </Radio>
          ))}
        </Group>
      )}

      <Group title="Price">
        {PRICE_RANGES.map((r) => (
          <Radio
            key={r.id}
            name="price"
            value={r.id}
            checked={values.price === r.id}
            onChange={(v) => onChange({ price: v })}
          >
            {r.label}
          </Radio>
        ))}
        {facets?.priceRange?.max > 0 && (
          <p className="text-xs text-rose-50/50">
            Range in this view: {formatPrice(facets.priceRange.min)} –{' '}
            {formatPrice(facets.priceRange.max)}
          </p>
        )}
      </Group>

      <Group title="Condition">
        {Object.entries(CONDITION_LABELS).map(([value, label]) => (
          <Check
            key={value}
            name="condition"
            value={value}
            checked={values.condition.includes(value)}
            onChange={() => toggleCondition(value)}
            count={condCount(value)}
          >
            {label}
          </Check>
        ))}
      </Group>

      {facets?.storage?.length > 0 && (
        <Group title="Storage">
          <Radio
            name="storage"
            value=""
            checked={!values.storage}
            onChange={() => onChange({ storage: '' })}
          >
            Any storage
          </Radio>
          {facets.storage.map((s) => (
            <Radio
              key={s.value}
              name="storage"
              value={s.value}
              checked={values.storage === s.value}
              onChange={(v) => onChange({ storage: v })}
              count={s.count}
            >
              {s.value}
            </Radio>
          ))}
        </Group>
      )}

      <Group title="Availability">
        <Check
          name="inStock"
          value="true"
          checked={values.inStock}
          onChange={(e) => onChange({ inStock: e.target.checked })}
        >
          In stock only
        </Check>
      </Group>
    </div>
  );
}
