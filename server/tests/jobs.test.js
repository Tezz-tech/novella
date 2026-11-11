import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /api/jobs/cancel-stale', () => {
  it('refuses calls without the cron secret', async () => {
    const res = await request(app).get('/api/jobs/cancel-stale');
    expect(res.status).toBe(401);
  });

  it('refuses a wrong secret', async () => {
    const res = await request(app)
      .get('/api/jobs/cancel-stale')
      .set('Authorization', 'Bearer wrong');
    expect(res.status).toBe(401);
  });
});
