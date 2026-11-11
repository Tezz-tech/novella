import express from 'express';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/index.js';
import { securityHeaders, corsPolicy, sanitize, apiLimiter } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Behind a host's proxy (Render, Railway) so rate limits see the real client IP.
  app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(corsPolicy);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitize);

  app.use('/api', apiLimiter);
  app.use('/api', apiRoutes);
  app.use('/api', notFound);

  app.use(errorHandler);

  return app;
}
