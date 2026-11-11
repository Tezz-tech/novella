import { Router } from 'express';
import healthRoutes from './health.routes.js';
import productRoutes from './public/products.routes.js';
import catalogueRoutes from './public/catalogue.routes.js';
import storefrontRoutes from './public/storefront.routes.js';
import cartRoutes from './public/cart.routes.js';
import newsletterRoutes from './public/newsletter.routes.js';
import authRoutes from './auth.routes.js';
import { ordersRoutes, paymentsRoutes } from './public/orders.routes.js';
import jobRoutes from './jobs.routes.js';
import adminRoutes from './admin.routes.js';
import accountRoutes from './account.routes.js';

/** All API routes, mounted under /api in app.js. Admin routers are added here in Phase 6. */
const router = Router();

router.use('/health', healthRoutes);
router.use('/products', productRoutes);
router.use('/', catalogueRoutes);
router.use('/', storefrontRoutes);
router.use('/cart', cartRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/auth', authRoutes);
router.use('/me', accountRoutes);
router.use('/orders', ordersRoutes);
router.use('/admin', adminRoutes);
router.use('/jobs', jobRoutes);
router.use('/payments', paymentsRoutes);

export default router;
