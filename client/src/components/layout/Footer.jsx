import { Link } from 'react-router-dom';
import Logo from '../brand/Logo.jsx';
import { Divider } from '../ui/display.jsx';
import { useSettings } from '../../lib/queries.js';

const LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/combos', label: 'Combos' },
  { to: '/deals', label: 'Deals' },
  { to: '/track', label: 'Track order' },
  { to: '/faq', label: 'FAQ' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const POLICIES = [
  { to: '/policies/returns', label: 'Returns' },
  { to: '/policies/privacy', label: 'Privacy' },
  { to: '/policies/terms', label: 'Terms' },
];

export default function Footer() {
  const { data: settings } = useSettings();
  const contact = settings?.contact ?? {};
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-ink-700 bg-ink-900 pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-8">
        <div className="flex flex-col gap-4">
          <Logo variant="mark" className="h-14 w-auto" />
          <p className="font-accent text-lg italic text-rose-200">
            {settings?.tagline ?? 'Smart Deals. Pretty Prices. ✨'}
          </p>
          <p className="text-sm text-rose-50/60">
            Affordable phone combos, the latest smartphones and reliable support.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-rose-300">
            Explore
          </h2>
          <ul className="space-y-2.5 text-sm">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-rose-50/75 transition-colors hover:text-rose-200">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-rose-300">
            Policies
          </h2>
          <ul className="space-y-2.5 text-sm">
            {POLICIES.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-rose-50/75 transition-colors hover:text-rose-200">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-label text-rose-300">
            Get in touch
          </h2>
          <ul className="space-y-2.5 text-sm text-rose-50/75">
            {contact.phone && <li>{contact.phone}</li>}
            {contact.email && <li>{contact.email}</li>}
            {contact.address && <li>{contact.address}</li>}
            <li className="flex gap-4 pt-2">
              {contact.instagram && (
                <a
                  href={contact.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-200 hover:text-rose-50"
                >
                  Instagram
                </a>
              )}
              {contact.tiktok && (
                <a
                  href={contact.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-200 hover:text-rose-50"
                >
                  TikTok
                </a>
              )}
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Divider />
        <p className="py-6 text-center text-xs text-rose-50/50">
          © {year} Novelle Tech. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
