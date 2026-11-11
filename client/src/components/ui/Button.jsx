import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

const VARIANTS = {
  // Metal gradient fill, ink text, glow on hover, shine sweep (see ShineSweep).
  primary:
    'bg-metal text-ink-950 shadow-none hover:shadow-glow focus-visible:shadow-glow font-semibold',
  // Pill outline like the tagline box in the brand image.
  secondary: 'border border-rose-400 text-rose-200 hover:bg-rose-400/10 hover:text-rose-50',
  ghost: 'text-rose-200 hover:text-rose-50 hover:underline underline-offset-4',
  danger: 'bg-danger/90 text-ink-950 hover:bg-danger font-semibold',
};

const SIZES = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-base',
  icon: 'h-11 w-11 p-0',
};

const base =
  'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-pill font-body tracking-wide transition-[box-shadow,background-color,color,transform] duration-200 ease-brand active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

/**
 * Button or link. Pass `to` to render a router link.
 * Loading shows a spinner and keeps the label for screen readers.
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', to, loading = false, className = '', children, ...rest },
  ref
) {
  const classes = `${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span className={loading ? 'opacity-80' : undefined}>{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} ref={ref} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;
