import { Helmet } from 'react-helmet-async';

const SITE = 'Novelle Tech';
const DEFAULT_DESC =
  'Affordable phone combos, the latest smartphones, laptops and gadgets. Smart deals. Pretty prices.';

/** Per-page title, description, Open Graph and canonical tags. */
export default function Seo({
  title,
  description = DEFAULT_DESC,
  image = '/og-image.png',
  path = '',
  jsonLd,
}) {
  const fullTitle = title ? `${title} · ${SITE}` : `${SITE} · Smart Deals. Pretty Prices.`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}${path}`;
  const img = image?.startsWith('http') ? image : `${origin}${image}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
