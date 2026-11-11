/**
 * Line icons for each category. Drawn as SVG in the brand's rose colour, transparent background,
 * so they sit on any surface. Unknown slugs get the sparkle.
 */
const ICONS = {
  phones: (
    <>
      <rect x="15" y="6" width="18" height="36" rx="4" />
      <path d="M22 11h4" />
      <circle cx="24" cy="36" r="1.2" />
    </>
  ),
  laptops: (
    <>
      <rect x="11" y="12" width="26" height="19" rx="2" />
      <path d="M6 37h36" />
    </>
  ),
  accessories: (
    <>
      <rect x="14" y="8" width="20" height="32" rx="3" />
      <path d="M26 16l-4 7h5l-4 7" />
    </>
  ),
  combos: (
    <>
      <path d="M8 17l16-8 16 8v16l-16 8-16-8z" />
      <path d="M8 17l16 8 16-8M24 25v16" />
    </>
  ),
  'smart-watches': (
    <>
      <rect x="16" y="14" width="16" height="20" rx="4" />
      <path d="M19 14l1-7h8l1 7M19 34l1 7h8l1-7" />
    </>
  ),
  tablets: (
    <>
      <rect x="10" y="7" width="28" height="34" rx="4" />
      <circle cx="24" cy="36" r="1.2" />
    </>
  ),
  gaming: (
    <>
      <path d="M15 16h18a8 8 0 0 1 7 12l-2 6a4 4 0 0 1-7-1l-2-3h-8l-2 3a4 4 0 0 1-7 1l-2-6a8 8 0 0 1 7-12z" />
      <path d="M16 24h5M18.5 21.5v5" />
      <circle cx="31" cy="22" r="1" />
      <circle cx="29" cy="25" r="1" />
    </>
  ),
  others: (
    <path d="M24 8c1 7 3 9 10 10-7 1-9 3-10 10-1-7-3-9-10-10 7-1 9-3 10-10z" />
  ),
};

export default function CategoryIcon({ slug, className = 'h-12 w-12' }) {
  const body = ICONS[slug] ?? ICONS.others;
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`text-rose-300 ${className}`}
    >
      {body}
    </svg>
  );
}
