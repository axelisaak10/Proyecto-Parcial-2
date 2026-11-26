import request from 'supertest';
import { createTestApp, loginAs } from './test-helpers';

describe('Admin Backups & Database Reset', () => {
  it('forbids Customer users from accessing /api/admin/* endpoints', async () => {
    const { instance, cleanup } = createTestApp({ useFileDb: true });
    try {
      const customer = await loginAs(instance.app, 'customer@toystore.com', 'Customer123!');
      const headers = { Authorization: `Bearer ${customer.token}` };

      expect((await request(instance.app).post('/api/admin/backup').set(headers)).status).toBe(403);
      expect((await request(instance.app).get('/api/admin/backups').set(headers)).status).toBe(403);
      expect((await request(instance.app).delete('/api/admin/database').set(headers)).status).toBe(403);
    } finally {
      cleanup();
    }
  });

  it('creates, lists, downloads SQLite backup safely, blocks path traversal, and resets database', async () => {
    const { instance, cleanup } = createTestApp({ useFileDb: true });
    try {
      const admin = await loginAs(instance.app, 'admin@toystore.com', 'Admin123!');
      const headers = { Authorization: `Bearer ${admin.token}` };

      // Empty backups initially
      const emptyList = await request(instance.app).get('/api/admin/backups').set(headers);
      expect(emptyList.status).toBe(200);
      expect(emptyList.body.data).toEqual([]);

      // Create backup via VACUUM INTO
      const backupRes = await request(instance.app).post('/api/admin/backup').set(headers);
      expect(backupRes.status).toBe(200);
      const backupFile = backupRes.body.data[0].backupFile as string;
      expect(backupFile).toMatch(/^toystore_\d{8}_\d{6}(?:_\d+)?\.db$/);

      // List backups includes new snapshot
      const listRes = await request(instance.app).get('/api/admin/backups').set(headers);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].fileName).toBe(backupFile);

      // Download backup
      const downloadRes = await request(instance.app)
        .get(`/api/admin/backup/${backupFile}`)
        .set(headers);
      expect(downloadRes.status).toBe(200);
      expect(downloadRes.body).toBeDefined();

      // Path traversal blocked
      const traversalRes = await request(instance.app)
        .get('/api/admin/backup/..%2F..%2Fpackage.json')
        .set(headers);
      expect(traversalRes.status).toBe(404);

      // Create custom product then reset database -> returns to 8 seeded toys & Admin id=1
      await request(instance.app)
        .post('/api/products')
        .set(headers)
        .send({
          sku: 'SKU-TEMP-999',
          name: 'Juguete Temporal',
          category: 'Peluches',
          price: 120,
          stock: 4,
          isActive: true,
        });

      const clearRes = await request(instance.app).delete('/api/admin/database').set(headers);
      expect(clearRes.status).toBe(200);

      const productsAfterReset = await request(instance.app).get('/api/products').set(headers);
      expect(productsAfterReset.status).toBe(200);
      expect(productsAfterReset.body.data.total).toBe(8);

      const meAfterReset = await request(instance.app).get('/api/auth/me').set(headers);
      expect(meAfterReset.status).toBe(200);
      expect(meAfterReset.body.data[0].id).toBe(1);
    } finally {
      cleanup();
    }
  });
});
