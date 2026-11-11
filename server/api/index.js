/**
 * Vercel serverless entry point for the API. Every request is routed here (see vercel.json).
 * The Express app is built once per warm instance; the database connection is shared across requests.
 * The long-running listener and the in-process job timer in src/server.js are not used here:
 * scheduled work runs through Vercel cron (see /api/jobs/cancel-stale).
 */
import { createApp } from '../src/app.js';
import { connectDb } from '../src/config/db.js';

const app = createApp();
let connecting = null;

export default async function handler(req, res) {
  connecting ??= connectDb();
  await connecting;
  return app(req, res);
}
