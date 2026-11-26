import request from 'supertest';
import { createTestApp, loginAs } from './test-helpers';

describe('Products (ToyStore Catalog) CRUD & Validation', () => {
  it('requires authentication on /api/products and enforces Admin role on mutations', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const unauth = await request(instance.app).get('/api/products');
      expect(unauth.status).toBe(401);

      const customer = await loginAs(instance.app, 'customer@toystore.com', 'Customer123!');

      const listRes = await request(instance.app)
        .get('/api/products')
        .set('Authorization', `Bearer ${customer.token}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.total).toBe(8);
      expect(listRes.body.data.stats.totalProducts).toBe(8);
      expect(listRes.body.data.stats.lowStockCount).toBe(2);
      expect(listRes.body.data.categories.length).toBeGreaterThanOrEqual(6);

      const forbiddenCreate = await request(instance.app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          sku: 'SKU-TEST-1',
          name: 'Blocked Toy',
          category: 'Construcción',
          price: 199,
          stock: 5,
          isActive: true,
        });
      expect(forbiddenCreate.status).toBe(403);
    } finally {
      cleanup();
    }
  });

  it('supports search, category, and isActive filtering plus pagination', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const admin = await loginAs(instance.app, 'admin@toystore.com', 'Admin123!');
      const headers = { Authorization: `Bearer ${admin.token}` };

      const catRes = await request(instance.app)
        .get('/api/products?category=Construcci%C3%B3n')
        .set(headers);
      expect(catRes.status).toBe(200);
      expect(catRes.body.data.total).toBe(2);

      const searchRes = await request(instance.app)
        .get('/api/products?q=Galaxia&isActive=true&page=1&pageSize=5')
        .set(headers);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.products).toHaveLength(1);
      expect(searchRes.body.data.products[0].sku).toBe('SKU-CON-001');
    } finally {
      cleanup();
    }
  });

  it('performs full Admin CRUD lifecycle, rejects duplicate SKU (409) and unsafe imageUrl (400)', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const admin = await loginAs(instance.app, 'admin@toystore.com', 'Admin123!');
      const headers = { Authorization: `Bearer ${admin.token}` };

      // Unsafe imageUrl rejected
      const badImage = await request(instance.app)
        .post('/api/products')
        .set(headers)
        .send({
          sku: 'SKU-XSS-1',
          name: 'Unsafe Toy',
          category: 'Peluches',
          price: 50,
          stock: 3,
          imageUrl: 'javascript:alert(1)',
          isActive: true,
        });
      expect(badImage.status).toBe(400);

      // Create valid toy
      const createRes = await request(instance.app)
        .post('/api/products')
        .set(headers)
        .send({
          sku: 'sku-rc-900',
          name: 'Dron Acrobático Infantil',
          description: 'Dron ligero con protectores de hélices',
          category: 'Vehículos RC',
          price: 999.995,
          stock: 12,
          imageUrl: 'https://cdn.toystore.com/dron.webp',
          isActive: true,
        });
      expect(createRes.status).toBe(201);
      const created = createRes.body.data[0];
      expect(created.sku).toBe('SKU-RC-900');
      expect(created.price).toBe(1000);

      // Duplicate SKU -> 409
      const dupRes = await request(instance.app)
        .post('/api/products')
        .set(headers)
        .send({
          sku: 'SKU-RC-900',
          name: 'Otro Dron',
          category: 'Vehículos RC',
          price: 450,
          stock: 2,
          isActive: true,
        });
      expect(dupRes.status).toBe(409);

      // Get by ID
      const getRes = await request(instance.app)
        .get(`/api/products/${created.id}`)
        .set(headers);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data[0].name).toBe('Dron Acrobático Infantil');

      // Update product
      const updateRes = await request(instance.app)
        .put(`/api/products/${created.id}`)
        .set(headers)
        .send({
          sku: 'SKU-RC-900',
          name: 'Dron Acrobático Pro',
          description: 'Actualizado con luces LED',
          category: 'Vehículos RC',
          price: 1150.5,
          stock: 7,
          imageUrl: '/assets/dron.webp',
          isActive: true,
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data[0].name).toBe('Dron Acrobático Pro');
      expect(updateRes.body.data[0].stock).toBe(7);

      // Delete product
      const deleteRes = await request(instance.app)
        .delete(`/api/products/${created.id}`)
        .set(headers);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data[0].deleted).toBe(true);

      // Verify 404 after delete
      const afterDelete = await request(instance.app)
        .get(`/api/products/${created.id}`)
        .set(headers);
      expect(afterDelete.status).toBe(404);
    } finally {
      cleanup();
    }
  });
});
