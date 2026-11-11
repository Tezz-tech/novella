import { forwardRef, useId } from 'react';

/** Shared label + hint + error wrapper for inputs, selects and textareas. */
export function Field({ label, hint, error, id, children }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="text-xs font-medium uppercase tracking-label text-rose-200"
        >
          {label}
        </label>
      )}
      {typeof children === 'function' ? children(fieldId) : children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-rose-50/60">{hint}</p>
      ) : null}
    </div>
  );
}

const control =
  'w-full rounded-xl border border-ink-700 bg-ink-800 px-4 text-[15px] text-rose-50 placeholder:text-rose-50/40 transition-[box-shadow,border-color] duration-200 focus:border-rose-400 focus:outline-none focus:shadow-glow-sm disabled:opacity-50 aria-[invalid=true]:border-danger';

export const Input = forwardRef(function Input(
  { label, hint, error, id, className = '', ...rest },
  ref
) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(fieldId) => (
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error) || undefined}
          className={`${control} h-12 ${className}`}
          {...rest}
        />
      )}
    </Field>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, error, id, className = '', children, ...rest },
  ref
) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(fieldId) => (
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error) || undefined}
          className={`${control} h-12 appearance-none ${className}`}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, id, className = '', ...rest },
  ref
) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(fieldId) => (
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error) || undefined}
          className={`${control} min-h-24 py-3 ${className}`}
          {...rest}
        />
      )}
    </Field>
  );
});
