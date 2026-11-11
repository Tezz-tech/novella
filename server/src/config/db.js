import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

/**
 * Connects once. If the database is unreachable, the API still starts (so
 * /api/health can report it) and we retry in the background.
 */
export async function connectDb({ retryMs = 5000 } = {}) {
  const attempt = async () => {
    try {
      await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      logger.info(`MongoDB connected (${mongoose.connection.name})`);
    } catch (err) {
      logger.error(`MongoDB connection failed: ${err.message}. Retrying in ${retryMs / 1000}s`);
      setTimeout(attempt, retryMs).unref();
    }
  };
  await attempt();
}

export function dbState() {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return states[mongoose.connection.readyState] ?? 'unknown';
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
