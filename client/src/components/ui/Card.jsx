import { forwardRef } from 'react';

/** Surface card: ink-800, 1px border that brightens on hover, 20px radius. */
export const Card = forwardRef(function Card(
  { interactive = false, className = '', children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={`rounded-card border border-ink-700 bg-ink-800 transition-colors duration-300 ${
        interactive ? 'hover:border-rose-400/60' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
});

export function CardHeader({ title, action, className = '' }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-ink-700 px-5 py-4 ${className}`}
    >
      <h3 className="text-base text-rose-50">{title}</h3>
      {action}
    </div>
  );
}
