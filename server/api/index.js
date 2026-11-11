/**
 * Vercel serverless entry point for the API. Every request is routed here (see vercel.json).
 * The Express app is built once per warm instance. Each request makes sure the database is connected,
 * so an instance whose first connection failed recovers on its next request.
 * The long-running listener and the in-process job timer in src/server.js are not used here:
 * scheduled work runs through Vercel cron (see /api/jobs/cancel-stale).
 */
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb } from '../src/config/db.js';

const app = createApp();
let pending = null;

const ensureDatabase = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  pending ??= connectDb().finally(() => {
    pending = null;
  });
  return pending;
};

export default async function handler(req, res) {
  await ensureDatabase();
  return app(req, res);
}
