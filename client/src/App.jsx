import Logo from './components/brand/Logo.jsx';

/** Phase 0 placeholder. The real storefront, routes and providers arrive in later phases. */
export default function App() {
  return (
    <main className="bg-glow-radial relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <a href="#content" className="skip-link">
        Skip to content
      </a>

      <div id="content" className="rise-in flex flex-col items-center gap-8">
        <Logo />

        <p className="rise-in-delay font-accent text-xl italic text-rose-200 sm:text-2xl">
          <span className="inline-block rounded-full border border-rose-400/70 px-6 py-2 shadow-glow-sm">
            Smart Deals. Pretty Prices. <span aria-hidden="true">✨</span>
          </span>
        </p>

        <ul className="rise-in-delay flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] font-medium uppercase tracking-label text-rose-50/65 sm:text-xs">
          <li>Affordable Phone Combos</li>
          <li aria-hidden="true" className="text-rose-400">
            •
          </li>
          <li>Latest Smartphones</li>
          <li aria-hidden="true" className="text-rose-400">
            •
          </li>
          <li>Reliable Support</li>
        </ul>

        <p className="text-sm text-rose-50/50">
          Storefront is being built. Phase 0 scaffold is live.
        </p>
      </div>
    </main>
  );
}
