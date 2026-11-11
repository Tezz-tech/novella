import { formatPrice } from '../../lib/format.js';

const BADGE_TONES = {
  pink: 'border-rose-400/60 text-rose-200 bg-rose-400/10',
  gold: 'border-spark-400/60 text-spark-400 bg-spark-400/10',
  success: 'border-success/60 text-success bg-success/10',
  danger: 'border-danger/60 text-danger bg-danger/10',
  neutral: 'border-ink-700 text-rose-50/75 bg-ink-800',
};

/** Small uppercase pill: "Hot Deal", "New", "UK Used", "−15%". */
export function Badge({ tone = 'pink', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-label ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Metallic price with an optional struck-through compare price. Animates via CountUp in product pages. */
export function Price({ amount, compareAt, className = '', size = 'md' }) {
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-3xl' };
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={`font-semibold tabular-nums text-rose-50 ${sizes[size]}`}>
        {formatPrice(amount)}
      </span>
      {compareAt && compareAt > amount && (
        <s className="text-sm tabular-nums text-rose-50/50">
          <span className="sr-only">Was </span>
          {formatPrice(compareAt)}
        </s>
      )}
    </span>
  );
}

/** Five-star rating. Decorative when no count is given. */
export function Rating({ value = 0, count = 0 }) {
  const label = count
    ? `Rated ${value.toFixed(1)} out of 5 from ${count} reviews`
    : 'No reviews yet';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-rose-50/70" aria-label={label}>
      <span aria-hidden="true" className="tracking-[0.15em] text-spark-400">
        {'★'.repeat(Math.round(value))}
        <span className="text-rose-50/25">{'★'.repeat(5 - Math.round(value))}</span>
      </span>
      {count > 0 && <span>({count})</span>}
    </span>
  );
}

/** Thin rule with a small crown in the middle (section divider from the design system). */
export function Divider({ className = '' }) {
  return (
    <div className={`flex items-center gap-4 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-rose-400/60" />
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
        <path
          d="M2 14h18M3 5l4 4 4-6 4 6 4-4-1 8H4L3 5z"
          stroke="#E88FBF"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="3" cy="4" r="1.4" fill="#E88FBF" />
        <circle cx="11" cy="2" r="1.4" fill="#E88FBF" />
        <circle cx="19" cy="4" r="1.4" fill="#E88FBF" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-rose-400/60" />
    </div>
  );
}

/** Loading placeholder with a pink shimmer sweep. */
export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton relative overflow-hidden rounded-xl bg-ink-800 ${className}`}
    />
  );
}

/** Branded empty state with the crown and an optional action. */
export function EmptyState({ title, body, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <svg
        width="48"
        height="34"
        viewBox="0 0 22 16"
        fill="none"
        aria-hidden="true"
        className="opacity-80"
      >
        <path
          d="M2 14h18M3 5l4 4 4-6 4 6 4-4-1 8H4L3 5z"
          stroke="#E88FBF"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <h2 className="text-xl text-rose-50">{title}</h2>
      {body && <p className="max-w-sm text-sm text-rose-50/65">{body}</p>}
      {action}
    </div>
  );
}
