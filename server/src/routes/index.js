import { Router } from 'express';
import healthRoutes from './health.routes.js';
import productRoutes from './public/products.routes.js';
import catalogueRoutes from './public/catalogue.routes.js';
import storefrontRoutes from './public/storefront.routes.js';

/** All API routes, mounted under /api in app.js. Admin routers are added here in Phase 6. */
const router = Router();

router.use('/health', healthRoutes);
router.use('/products', productRoutes);
router.use('/', catalogueRoutes);
router.use('/', storefrontRoutes);

export default router;
