import { Router } from 'express';
import healthRoutes from './health.routes.js';

/** All API routes, mounted under /api in app.js. Public and admin routers are added here. */
const router = Router();

router.use('/health', healthRoutes);

export default router;
