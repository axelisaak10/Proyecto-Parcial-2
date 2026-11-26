import request from 'supertest';
import { loadConfig } from '../src/config/env';
import { createAuthRateLimiter } from '../src/middleware/rate-limit.middleware';
import express from 'express';
import { createTestApp, loginAs } from './test-helpers';

describe('Edge Cases, Error Paths & Configuration Guards', () => {
  it('throws in production when JWT_KEY is missing', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevKey = process.env.JWT_KEY;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_KEY;
      expect(() => loadConfig()).toThrow('JWT_KEY must be configured');
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevKey !== undefined) process.env.JWT_KEY = prevKey;
      else delete process.env.JWT_KEY;
    }
  });

  it('rejects malformed JWTs, invalid route IDs, non-existent records, and SKU update conflicts', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const badToken = await request(instance.app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt');
      expect(badToken.status).toBe(401);

      const admin = await loginAs(instance.app, 'admin@toystore.com', 'Admin123!');
      const headers = { Authorization: `Bearer ${admin.token}` };

      // Invalid positive int params -> 400
      expect((await request(instance.app).get('/api/users/abc').set(headers)).status).toBe(400);
      expect((await request(instance.app).post('/api/users/abc/profile').set(headers).send({})).status).toBe(400);
      expect((await request(instance.app).post('/api/users/abc/password').set(headers).send({})).status).toBe(400);
      expect((await request(instance.app).patch('/api/users/abc/status').set(headers).send({ isActive: true })).status).toBe(400);
      expect((await request(instance.app).patch('/api/users/abc/role').set(headers).send({ roleId: 2 })).status).toBe(400);
      expect((await request(instance.app).delete('/api/users/abc').set(headers)).status).toBe(400);
      expect((await request(instance.app).get('/api/products/abc').set(headers)).status).toBe(400);
      expect((await request(instance.app).put('/api/products/abc').set(headers).send({})).status).toBe(400);
      expect((await request(instance.app).delete('/api/products/abc').set(headers)).status).toBe(400);

      // Not found records -> 404
      expect((await request(instance.app).get('/api/users/9999').set(headers)).status).toBe(404);
      expect((await request(instance.app).post('/api/users/9999/profile').set(headers).send({ city: 'X' })).status).toBe(404);
      expect((await request(instance.app).patch('/api/users/9999/status').set(headers).send({ isActive: false })).status).toBe(404);
      expect((await request(instance.app).patch('/api/users/9999/role').set(headers).send({ roleId: 2 })).status).toBe(404);
      expect((await request(instance.app).delete('/api/users/9999').set(headers)).status).toBe(404);
      expect((await request(instance.app).get('/api/products/9999').set(headers)).status).toBe(404);
      expect((await request(instance.app).delete('/api/products/9999').set(headers)).status).toBe(404);
      expect((await request(instance.app).get('/api/admin/backup/missing.db').set(headers)).status).toBe(404);

      // Admin create duplicate user -> 409
      const dupUser = await request(instance.app)
        .post('/api/users')
        .set(headers)
        .send({
          email: 'admin@toystore.com',
          password: 'Password123!',
          firstName: 'Dup',
          lastName: 'User',
          roleId: 2,
        });
      expect(dupUser.status).toBe(409);

      // Update product SKU conflict -> 409
      const skuConflict = await request(instance.app)
        .put('/api/products/2')
        .set(headers)
        .send({
          sku: 'SKU-CON-001',
          name: 'Conflict Toy',
          category: 'Construcción',
          price: 100,
          stock: 1,
          isActive: true,
        });
      expect(skuConflict.status).toBe(409);

      // Disallowed CORS origin does not receive Allow-Origin header
      const corsRes = await request(instance.app)
        .get('/api/health')
        .set('Origin', 'https://evil.example.com');
      expect(corsRes.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      cleanup();
    }
  });

  it('enforces 429 rate limit response in non-test mode', async () => {
    const miniApp = express();
    miniApp.post('/limited', createAuthRateLimiter(false), (_req, res) => {
      res.status(200).json({ ok: true });
    });

    for (let i = 0; i < 20; i++) {
      const ok = await request(miniApp).post('/limited');
      expect(ok.status).toBe(200);
    }

    const blocked = await request(miniApp).post('/limited');
    expect(blocked.status).toBe(429);
    expect(blocked.body.statusCode).toBe(429);
  });
});
