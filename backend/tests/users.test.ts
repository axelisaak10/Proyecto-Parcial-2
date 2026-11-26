import request from 'supertest';
import { createTestApp, loginAs } from './test-helpers';

describe('Users Management, RBAC & IDOR Protection', () => {
  it('enforces Admin RBAC and IDOR protection on /api/users/*', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const customer = await loginAs(instance.app, 'customer@toystore.com', 'Customer123!');
      const headers = { Authorization: `Bearer ${customer.token}` };

      const listForbidden = await request(instance.app).get('/api/users').set(headers);
      expect(listForbidden.status).toBe(403);

      const searchForbidden = await request(instance.app)
        .get('/api/users/search?q=admin')
        .set(headers);
      expect(searchForbidden.status).toBe(403);

      // IDOR: customer (id=2) cannot view or update admin (id=1)
      const idorGet = await request(instance.app).get('/api/users/1').set(headers);
      expect(idorGet.status).toBe(403);

      const idorProfile = await request(instance.app)
        .post('/api/users/1/profile')
        .set(headers)
        .send({ city: 'HackCity' });
      expect(idorProfile.status).toBe(403);

      // Owner can view own profile (id=2)
      const ownProfile = await request(instance.app).get('/api/users/2').set(headers);
      expect(ownProfile.status).toBe(200);
      expect(ownProfile.body.data[0].email).toBe('customer@toystore.com');
    } finally {
      cleanup();
    }
  });

  it('supports full Admin user lifecycle, profile update, password change, role/status guards', async () => {
    const { instance, cleanup } = createTestApp();
    try {
      const admin = await loginAs(instance.app, 'admin@toystore.com', 'Admin123!');
      const headers = { Authorization: `Bearer ${admin.token}` };

      // List & Search
      const listRes = await request(instance.app)
        .get('/api/users?page=1&pageSize=10&isActive=true')
        .set(headers);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.total).toBe(2);

      const badSearch = await request(instance.app).get('/api/users/search?q=').set(headers);
      expect(badSearch.status).toBe(400);

      const searchRes = await request(instance.app)
        .get('/api/users/search?q=carlos')
        .set(headers);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data).toHaveLength(1);

      // Create user
      const createRes = await request(instance.app)
        .post('/api/users')
        .set(headers)
        .send({
          email: 'lucia@toystore.com',
          password: 'LuciaPass123!',
          firstName: 'Lucía',
          lastName: 'Vargas',
          roleId: 2,
        });
      expect(createRes.status).toBe(201);
      const userId = createRes.body.data[0].id as number;

      // Update profile
      const profileRes = await request(instance.app)
        .post(`/api/users/${userId}/profile`)
        .set(headers)
        .send({
          firstName: 'Lucía',
          lastName: 'Vargas',
          city: 'Guadalajara',
          country: 'México',
        });
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data[0].city).toBe('Guadalajara');

      // Change password (wrong current -> 400, valid -> 200)
      const wrongPass = await request(instance.app)
        .post(`/api/users/${userId}/password`)
        .set(headers)
        .send({ currentPassword: 'Wrong!', newPassword: 'NewLuciaPass123!' });
      expect(wrongPass.status).toBe(400);

      const okPass = await request(instance.app)
        .post(`/api/users/${userId}/password`)
        .set(headers)
        .send({ currentPassword: 'LuciaPass123!', newPassword: 'NewLuciaPass123!' });
      expect(okPass.status).toBe(200);

      // Update role to Admin and back
      const roleRes = await request(instance.app)
        .patch(`/api/users/${userId}/role`)
        .set(headers)
        .send({ roleId: 1 });
      expect(roleRes.status).toBe(200);
      expect(roleRes.body.data[0].role).toBe('Admin');

      // Guard: Admin cannot remove own Admin role or deactivate self
      const selfDemote = await request(instance.app)
        .patch('/api/users/1/role')
        .set(headers)
        .send({ roleId: 2 });
      expect(selfDemote.status).toBe(400);

      const selfDeactivate = await request(instance.app)
        .patch('/api/users/1/status')
        .set(headers)
        .send({ isActive: false });
      expect(selfDeactivate.status).toBe(400);

      // Soft delete via DELETE /api/users/:id
      const delRes = await request(instance.app)
        .delete(`/api/users/${userId}`)
        .set(headers);
      expect(delRes.status).toBe(200);
      expect(delRes.body.data[0].isActive).toBe(false);
    } finally {
      cleanup();
    }
  });
});
