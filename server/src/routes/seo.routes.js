import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { buildSitemap, buildRobots } from '../services/seo.service.js';

/** Mounted at the site root (not under /api), so crawlers find /sitemap.xml and /robots.txt. */
const router = Router();

router.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    res.type('application/xml').send(await buildSitemap());
  })
);

router.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(buildRobots());
});

export default router;
