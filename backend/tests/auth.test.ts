import request from 'supertest';
import { createTestApp, loginAs } from './test-helpers';

describe('Authentication, Cookies & CSRF Protection', () => {
  it('registers a new customer and rejects duplicate emails with 409', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const payload = {
        email: 'Sofia.Toy@ToyStore.com',
        password: 'Password123!',
        firstName: 'Sofía',
        lastName: 'Navarro',
      };

      const registerRes = await request(instance.app).post('/api/auth/register').send(payload);
      expect(registerRes.status).toBe(201);
      expect(registerRes.body.statusCode).toBe(201);
      expect(registerRes.body.data[0].email).toBe('sofia.toy@toystore.com');

      const duplicateRes = await request(instance.app).post('/api/auth/register').send(payload);
      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.message).toBe('Email already registered');
    } finally {
      cleanup();
    }
  });

  it('returns 400 on invalid registration payload', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const res = await request(instance.app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: '123',
        firstName: '',
        lastName: 'Doe',
      });
      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    } finally {
      cleanup();
    }
  });

  it('logs in Admin, sets HttpOnly toystore_auth cookie, rejects bad credentials, and supports Bearer + Cookie /me', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const badLogin = await request(instance.app)
        .post('/api/auth/login')
        .send({ email: 'admin@toystore.com', password: 'WrongPassword!' });
      expect(badLogin.status).toBe(401);

      const loginRes = await request(instance.app)
        .post('/api/auth/login')
        .send({ email: 'admin@toystore.com', password: 'Admin123!' });
      expect(loginRes.status).toBe(200);

      const setCookie = String(loginRes.headers['set-cookie'] || '');
      expect(setCookie.toLowerCase()).toContain('toystore_auth=');
      expect(setCookie.toLowerCase()).toContain('httponly');
      expect(setCookie.toLowerCase()).toContain('samesite=lax');

      const token = loginRes.body.data[0].token as string;
      expect(token.length).toBeGreaterThan(20);
      expect(loginRes.body.data[0].user.role).toBe('Admin');

      // /api/auth/me with Bearer token
      const meBearer = await request(instance.app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meBearer.status).toBe(200);
      expect(meBearer.body.data[0].email).toBe('admin@toystore.com');
      expect(meBearer.body.data[0].profile.lastName).toBe('ToyStore');

      // /api/auth/me with HttpOnly cookie
      const cookieHeader = setCookie.split(';')[0];
      const meCookie = await request(instance.app)
        .get('/api/auth/me')
        .set('Cookie', cookieHeader);
      expect(meCookie.status).toBe(200);
      expect(meCookie.body.data[0].role).toBe('Admin');

      // Unauthenticated /me returns 401
      const unauthMe = await request(instance.app).get('/api/auth/me');
      expect(unauthMe.status).toBe(401);
    } finally {
      cleanup();
    }
  });

  it('enforces X-Requested-With CSRF protection on cookie-authenticated mutations and allows logout', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const { cookie } = await loginAs(instance.app, 'admin@toystore.com', 'Admin123!');
      const cookiePair = cookie.split(';')[0];

      // Mutating POST with cookie but missing X-Requested-With -> 403
      const csrfBlocked = await request(instance.app)
        .post('/api/products')
        .set('Cookie', cookiePair)
        .send({
          sku: 'SKU-CSRF-1',
          name: 'Juguete CSRF',
          category: 'Construcción',
          price: 100,
          stock: 5,
          isActive: true,
        });
      expect(csrfBlocked.status).toBe(403);
      expect(csrfBlocked.body.message).toBe('Missing CSRF protection header');

      // With X-Requested-With: XMLHttpRequest -> succeeds
      const csrfAllowed = await request(instance.app)
        .post('/api/products')
        .set('Cookie', cookiePair)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          sku: 'SKU-CSRF-1',
          name: 'Juguete CSRF',
          category: 'Construcción',
          price: 100,
          stock: 5,
          isActive: true,
        });
      expect(csrfAllowed.status).toBe(201);

      // Logout clears toystore_auth cookie
      const logoutRes = await request(instance.app)
        .post('/api/auth/logout')
        .set('Cookie', cookiePair)
        .set('X-Requested-With', 'XMLHttpRequest');
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.data.loggedOut).toBe(true);
      expect(String(logoutRes.headers['set-cookie'] || '')).toContain('toystore_auth=;');
    } finally {
      cleanup();
    }
  });

  it('blocks deactivated accounts from logging in or calling /api/auth/me', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const admin = await loginAs(instance.app, 'admin@toystore.com', 'Admin123!');
      const customer = await loginAs(instance.app, 'customer@toystore.com', 'Customer123!');

      // Deactivate customer (id = 2)
      const deactivateRes = await request(instance.app)
        .patch('/api/users/2/status')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ isActive: false });
      expect(deactivateRes.status).toBe(200);

      // Deactivated login fails with 403
      const loginBlocked = await request(instance.app)
        .post('/api/auth/login')
        .send({ email: 'customer@toystore.com', password: 'Customer123!' });
      expect(loginBlocked.status).toBe(403);

      // Existing token also blocked on /me
      const meBlocked = await request(instance.app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customer.token}`);
      expect(meBlocked.status).toBe(403);
    } finally {
      cleanup();
    }
  });
});
