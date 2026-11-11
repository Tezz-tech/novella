/**
 * A diagonal light sweep across its parent on hover. The parent must be `group` and `relative overflow-hidden`.
 * Pure CSS transform, disabled under reduced motion via the .shine rule in index.css.
 */
export default function ShineSweep({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`shine motion-reduce:hidden pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[120%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:animate-[shine_1.2s_cubic-bezier(0.22,1,0.36,1)] ${className}`}
    />
  );
}
