import { createApp } from './app.js';
import { env, missingOptional } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { logger } from './utils/logger.js';
import { startJobs } from './jobs/cancelStaleOrders.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  const missing = missingOptional();
  if (missing.length) logger.warn(`Not configured yet: ${missing.join(', ')}`);
});

connectDb();
startJobs();

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
