import { Product, Category } from '../models/index.js';
import { env } from '../config/env.js';

const escapeXml = (s) =>
  String(s).replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]
  );

/** Sitemap of public storefront pages, built from live catalogue data. */
export async function buildSitemap() {
  const base = env.CLIENT_URL.replace(/\/$/, '');
  const [products, categories] = await Promise.all([
    Product.find({ status: 'active' }).select('slug updatedAt').lean(),
    Category.find({ isActive: true }).select('slug updatedAt').lean(),
  ]);

  const staticPages = [
    '/',
    '/shop',
    '/combos',
    '/deals',
    '/about',
    '/contact',
    '/faq',
    '/policies/returns',
    '/policies/privacy',
    '/policies/terms',
  ];
  const urls = [
    ...staticPages.map((p) => ({ loc: `${base}${p}` })),
    ...categories.map((c) => ({ loc: `${base}/category/${c.slug}`, lastmod: c.updatedAt })),
    ...products.map((p) => ({ loc: `${base}/product/${p.slug}`, lastmod: p.updatedAt })),
  ];

  const body = urls
    .map(
      (u) =>
        `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** robots.txt: allow the storefront, keep admin and the API out of search, point at the sitemap. */
export function buildRobots() {
  const base = env.CLIENT_URL.replace(/\/$/, '');
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\nDisallow: /order\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`;
}
