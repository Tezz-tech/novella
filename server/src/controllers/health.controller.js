import { dbState } from '../config/db.js';

export function getHealth(_req, res) {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      db: dbState(),
    },
  });
}
