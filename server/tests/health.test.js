import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /api/health', () => {
  it('returns ok with a db state', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(['connected', 'disconnected', 'connecting', 'disconnecting', 'unknown']).toContain(
      res.body.data.db
    );
  });

  it('sends security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('error handling', () => {
  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false });
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Malformed JSON body' });
  });

  it('only allows CORS from CLIENT_URL', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://evil.example');
    // cors echoes the configured origin, never the requesting one.
    expect(res.headers['access-control-allow-origin']).toBe(process.env.CLIENT_URL);
    expect(res.headers['access-control-allow-origin']).not.toBe('http://evil.example');
  });
});
