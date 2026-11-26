import request from 'supertest';
import { createTestApp } from './test-helpers';

describe('Health & System Endpoints', () => {
  it('GET /api/health returns 200 ok with connected SQLite database and no-store headers', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const res = await request(instance.app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.headers['pragma']).toBe('no-cache');
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('toystore-api');
      expect(res.body.database).toBe('connected');
      expect(res.body.version).toBe('2.0.0');
      expect(typeof res.body.timestamp).toBe('string');
    } finally {
      cleanup();
    }
  });

  it('GET /api/health returns degraded when database connection fails', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      instance.db.close();
      const res = await request(instance.app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.database).toBe('disconnected');
    } finally {
      try {
        cleanup();
      } catch {
        // db already closed intentionally
      }
    }
  });

  it('returns 404 ApiResponse for unknown routes', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const res = await request(instance.app).get('/api/nonexistent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Endpoint not found');
    } finally {
      cleanup();
    }
  });
});
