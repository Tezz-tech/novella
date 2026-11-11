import { cancelStaleOrders } from '../services/checkout.service.js';
import { logger } from '../utils/logger.js';

const EVERY_30_MIN = 30 * 60 * 1000;

/**
 * Runs cancelStaleOrders every 30 minutes (docs/03). Uses setInterval rather than a cron library:
 * one job, no extra dependency. Started only by server.js, never in tests.
 */
export function startJobs() {
  const timer = setInterval(() => {
    cancelStaleOrders()
      .then((n) => n && logger.info(`Cancelled ${n} unpaid order(s)`))
      .catch((err) => logger.error('Stale order job failed', err));
  }, EVERY_30_MIN);
  timer.unref();
  return () => clearInterval(timer);
}
