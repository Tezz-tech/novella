/**
 * Novelle Tech logo: crown-N mark plus a code-built wordmark (NOVELLE in Cinzel
 * with the metal gradient, TECH underneath with thin pink rules). Never recoloured.
 *
 * variant="full"  mark + wordmark (default)
 * variant="mark"  crown-N only (for small or mobile headers)
 */
export default function Logo({ variant = 'full', className = '' }) {
  const mark = (
    <img
      src="/brand/logo-mark.png"
      alt={variant === 'mark' ? 'Novelle Tech' : ''}
      width="453"
      height="366"
      decoding="async"
      className={variant === 'mark' ? 'h-10 w-auto' : 'h-16 w-auto sm:h-20'}
    />
  );

  if (variant === 'mark') {
    return <span className={`inline-flex items-center ${className}`}>{mark}</span>;
  }

  return (
    <span className={`inline-flex flex-col items-center gap-1 ${className}`}>
      {mark}
      <span className="font-display text-metal text-2xl font-semibold tracking-wide sm:text-3xl">
        NOVELLE
      </span>
      <span className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-rose-300 sm:w-14" />
        <span className="font-body text-[11px] font-medium tracking-brand text-rose-300 sm:text-xs">
          TECH
        </span>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-rose-300 sm:w-14" />
      </span>
      <span className="sr-only">Novelle Tech</span>
    </span>
  );
}
