import { expect, test } from '@playwright/test';

test.describe('API Contract & Security (Backend Express)', () => {
  test('GET /api/health returns ok with connected SQLite database and no-store cache headers', async ({ request }) => {
    const resp = await request.get('/api/health');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['cache-control']).toContain('no-store');
    const body = await resp.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('toystore-api');
    expect(body.database).toBe('connected');
  });

  test('Enforces authentication, RBAC, IDOR protection and HttpOnly cookie on auth', async ({ request }) => {
    // Unauthenticated access blocked
    const unauthProducts = await request.get('/api/products');
    expect(unauthProducts.status()).toBe(401);

    // Admin login sets HttpOnly cookie and returns user summary
    const adminLogin = await request.post('/api/auth/login', {
      data: { email: 'admin@toystore.com', password: 'Admin123!' },
    });
    expect(adminLogin.status()).toBe(200);
    const setCookieHeader = adminLogin.headers()['set-cookie'] || '';
    expect(setCookieHeader.toLowerCase()).toContain('toystore_auth=');
    expect(setCookieHeader.toLowerCase()).toContain('httponly');

    const adminData = await adminLogin.json();
    const adminToken = adminData.data[0].token as string;
    expect(adminToken.length).toBeGreaterThan(20);

    // /api/auth/me works with Bearer token
    const meResp = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(meResp.status()).toBe(200);
    const meJson = await meResp.json();
    expect(meJson.data[0].role).toBe('Admin');

    // Customer login cannot access Admin endpoints or other user's profile (IDOR)
    const custLogin = await request.post('/api/auth/login', {
      data: { email: 'customer@toystore.com', password: 'Customer123!' },
    });
    expect(custLogin.status()).toBe(200);
    const custToken = (await custLogin.json()).data[0].token as string;

    const idorResp = await request.get('/api/users/1', {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    expect(idorResp.status()).toBe(403);

    const custCreateProduct = await request.post('/api/products', {
      headers: { Authorization: `Bearer ${custToken}` },
      data: {
        sku: 'SKU-FORBID-1',
        name: 'Juguete Bloqueado',
        category: 'Construcción',
        price: 10,
        stock: 1,
        isActive: true,
      },
    });
    expect(custCreateProduct.status()).toBe(403);
  });

  test('Full Products CRUD API lifecycle as Admin', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { email: 'admin@toystore.com', password: 'Admin123!' },
    });
    const token = (await login.json()).data[0].token as string;
    const headers = { Authorization: `Bearer ${token}` };

    const uniqueSku = `SKU-API-${Date.now()}`;
    const createResp = await request.post('/api/products', {
      headers,
      data: {
        sku: uniqueSku,
        name: 'Set Bloques Espaciales API',
        description: 'Nave modular de bloques para niños de 8+ años',
        category: 'Construcción',
        price: 549.5,
        stock: 15,
        isActive: true,
      },
    });
    expect(createResp.status()).toBe(201);
    const productId = (await createResp.json()).data[0].id as number;

    const getResp = await request.get(`/api/products/${productId}`, { headers });
    expect(getResp.status()).toBe(200);

    const updateResp = await request.put(`/api/products/${productId}`, {
      headers,
      data: {
        sku: uniqueSku,
        name: 'Set Bloques Espaciales API Pro',
        description: 'Edición especial con luces LED',
        category: 'Educativos STEM',
        price: 699.99,
        stock: 9,
        isActive: true,
      },
    });
    expect(updateResp.status()).toBe(200);

    const deleteResp = await request.delete(`/api/products/${productId}`, { headers });
    expect(deleteResp.status()).toBe(200);

    const afterDelete = await request.get(`/api/products/${productId}`, { headers });
    expect(afterDelete.status()).toBe(404);
  });
});
