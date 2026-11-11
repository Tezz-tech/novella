import { Link } from 'react-router-dom';
import { useSettings } from '../lib/queries.js';
import Seo from '../components/seo/Seo.jsx';
import Button from '../components/ui/Button.jsx';
import { Divider, Skeleton } from '../components/ui/display.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';

function Page({ title, path, eyebrow, children }) {
  return (
    <>
      <Seo title={title} path={path} />
      <article className="mx-auto max-w-3xl px-4 pb-20 pt-12 md:px-8">
        <Reveal className="space-y-3">
          {eyebrow && <p className="text-xs uppercase tracking-label text-rose-300">{eyebrow}</p>}
          <h1 className="text-4xl md:text-5xl">{title}</h1>
          <Divider className="my-6" />
        </Reveal>
        <div className="space-y-5 text-[15px] leading-relaxed text-rose-50/80">{children}</div>
      </article>
    </>
  );
}

const Text = ({ text }) =>
  text ? (
    <p className="whitespace-pre-line">{text}</p>
  ) : (
    <p className="text-rose-50/50">This section will be updated shortly.</p>
  );

export function About() {
  return (
    <Page title="About Novelle Tech" path="/about" eyebrow="Our story">
      <p>
        Novelle Tech sells phones, laptops and gadgets at honest prices, with a focus on affordable
        phone combos and the latest smartphones.
      </p>
      <p>
        We believe good tech should feel as good as it looks, so every listing shows its condition
        clearly, every price is checked on our side, and real people answer when you message us.
      </p>
    </Page>
  );
}

export function Contact() {
  const { data, isLoading } = useSettings();
  const c = data?.contact ?? {};
  const number = (c.whatsapp || '').replace(/\D/g, '');
  return (
    <Page title="Contact us" path="/contact" eyebrow="We are here">
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="space-y-3">
          {c.phone && <li>Phone: {c.phone}</li>}
          {c.email && (
            <li>
              Email:{' '}
              <a className="text-rose-200 underline underline-offset-4" href={`mailto:${c.email}`}>
                {c.email}
              </a>
            </li>
          )}
          {c.address && <li>Address: {c.address}</li>}
          {data?.pickupAddress && <li>Pickup: {data.pickupAddress}</li>}
        </ul>
      )}
      <div className="flex flex-wrap gap-3 pt-4">
        {number && (
          <Button
            onClick={() => window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer')}
          >
            Chat on WhatsApp
          </Button>
        )}
        {c.instagram && (
          <Button
            variant="secondary"
            onClick={() => window.open(c.instagram, '_blank', 'noopener,noreferrer')}
          >
            Instagram
          </Button>
        )}
      </div>
    </Page>
  );
}

export function FAQ() {
  const { data, isLoading } = useSettings();
  return (
    <Page title="Frequently asked questions" path="/faq" eyebrow="Help">
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data?.faq?.length ? (
        <div className="space-y-3">
          {data.faq.map((f) => (
            <details
              key={f.question}
              className="group rounded-2xl border border-ink-700 bg-ink-800 px-5 py-4 open:border-rose-400/50"
            >
              <summary className="cursor-pointer list-none text-rose-50 marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {f.question}
                  <span
                    aria-hidden="true"
                    className="text-rose-300 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-rose-50/75">{f.answer}</p>
            </details>
          ))}
        </div>
      ) : (
        !isLoading && (
          <p className="text-rose-50/60">
            Questions will appear here soon. Ask us on WhatsApp in the meantime.
          </p>
        )
      )}
      <p>
        Still stuck?{' '}
        <Link to="/contact" className="text-rose-200 underline underline-offset-4">
          Contact us
        </Link>
        .
      </p>
    </Page>
  );
}

function PolicyPage({ kind, title, path }) {
  const { data, isLoading } = useSettings();
  return (
    <Page title={title} path={path} eyebrow="Policies">
      {isLoading ? <Skeleton className="h-40 w-full" /> : <Text text={data?.policies?.[kind]} />}
    </Page>
  );
}

export const Returns = () => (
  <PolicyPage kind="returns" title="Returns policy" path="/policies/returns" />
);
export const Privacy = () => (
  <PolicyPage kind="privacy" title="Privacy policy" path="/policies/privacy" />
);
export const Terms = () => <PolicyPage kind="terms" title="Terms of sale" path="/policies/terms" />;
