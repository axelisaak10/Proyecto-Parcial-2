import bcrypt from 'bcryptjs';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { UserRole } from '../middleware/auth.middleware';
import { tracer } from '../observability/telemetry';
import { apiError, apiSuccess, type ApiResponse } from '../types/api-response';
import type {
  AdminCreateUserInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from '../validation/schemas';

interface UserListRow {
  id: number;
  email: string;
  role_id: number;
  role_name: UserRole;
  is_active: number;
  created_at: string;
  updated_at: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
}

export class UserService {
  constructor(private readonly db: DatabaseSync) {}

  getAll(
    page: number,
    pageSize: number,
    q?: string | null,
    isActive?: boolean | null
  ): ApiResponse<unknown> {
    return tracer.startActiveSpan('UserService.GetAll', (span) => {
      try {
        const safePage = page < 1 ? 1 : page;
        const safePageSize = Math.min(Math.max(pageSize, 1), 100);

        const whereClauses: string[] = [];
        const params: SQLInputValue[] = [];

        if (q && q.trim()) {
          const likeTerm = `%${q.trim().toLowerCase()}%`;
          whereClauses.push(
            '(LOWER(u.email) LIKE ? OR LOWER(COALESCE(p.first_name, \'\')) LIKE ? OR LOWER(COALESCE(p.last_name, \'\')) LIKE ?)'
          );
          params.push(likeTerm, likeTerm, likeTerm);
        }

        if (typeof isActive === 'boolean') {
          whereClauses.push('u.is_active = ?');
          params.push(isActive ? 1 : 0);
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countRow = this.db
          .prepare(
            `SELECT COUNT(*) AS total
             FROM Users u
             LEFT JOIN Profiles p ON p.user_id = u.id
             ${whereSql}`
          )
          .get(...params) as { total: number };

        const offset = (safePage - 1) * safePageSize;
        const rows = this.db
          .prepare(
            `SELECT u.id, u.email, u.role_id, r.name AS role_name, u.is_active, u.created_at, u.updated_at,
                    p.first_name, p.last_name, p.phone, p.address, p.city, p.country
             FROM Users u
             JOIN Roles r ON r.id = u.role_id
             LEFT JOIN Profiles p ON p.user_id = u.id
             ${whereSql}
             ORDER BY u.id ASC
             LIMIT ? OFFSET ?`
          )
          .all(...params, safePageSize, offset) as unknown as UserListRow[];

        const users = rows.map((u) => ({
          id: u.id,
          email: u.email,
          roleId: u.role_id,
          role: u.role_name,
          isActive: Boolean(u.is_active),
          profile:
            u.first_name === null && u.last_name === null
              ? null
              : {
                  firstName: u.first_name ?? '',
                  lastName: u.last_name ?? '',
                  phone: u.phone,
                  address: u.address,
                  city: u.city,
                  country: u.country,
                },
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        }));

        return apiSuccess(
          {
            total: countRow.total,
            page: safePage,
            pageSize: safePageSize,
            users,
          },
          'Users retrieved successfully'
        );
      } finally {
        span.end();
      }
    });
  }

  getById(id: number): ApiResponse<unknown> {
    return tracer.startActiveSpan('UserService.GetById', (span) => {
      try {
        span.setAttribute('user.id', id);

        const row = this.db
          .prepare(
            `SELECT u.id, u.email, u.role_id, r.name AS role_name, u.is_active, u.created_at, u.updated_at,
                    p.first_name, p.last_name, p.phone, p.address, p.city, p.country, p.avatar_url, p.date_of_birth
             FROM Users u
             JOIN Roles r ON r.id = u.role_id
             LEFT JOIN Profiles p ON p.user_id = u.id
             WHERE u.id = ?`
          )
          .get(id) as UserListRow | undefined;

        if (!row) {
          return apiError('User not found', 404);
        }

        const user = {
          id: row.id,
          email: row.email,
          roleId: row.role_id,
          role: row.role_name,
          isActive: Boolean(row.is_active),
          profile:
            row.first_name === null && row.last_name === null
              ? null
              : {
                  firstName: row.first_name ?? '',
                  lastName: row.last_name ?? '',
                  phone: row.phone,
                  address: row.address,
                  city: row.city,
                  country: row.country,
                  avatarUrl: row.avatar_url ?? null,
                  dateOfBirth: row.date_of_birth ?? null,
                },
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        return apiSuccess([user], 'User retrieved successfully');
      } finally {
        span.end();
      }
    });
  }

  search(query: string): ApiResponse<unknown> {
    return tracer.startActiveSpan('UserService.Search', (span) => {
      try {
        const likeTerm = `%${query.trim().toLowerCase()}%`;
        const rows = this.db
          .prepare(
            `SELECT u.id, u.email, u.role_id, r.name AS role_name, u.is_active,
                    p.first_name, p.last_name
             FROM Users u
             JOIN Roles r ON r.id = u.role_id
             LEFT JOIN Profiles p ON p.user_id = u.id
             WHERE LOWER(u.email) LIKE ?
                OR LOWER(COALESCE(p.first_name, '')) LIKE ?
                OR LOWER(COALESCE(p.last_name, '')) LIKE ?
             ORDER BY u.id ASC
             LIMIT 50`
          )
          .all(likeTerm, likeTerm, likeTerm) as unknown as Array<{
          id: number;
          email: string;
          role_id: number;
          role_name: UserRole;
          is_active: number;
          first_name: string | null;
          last_name: string | null;
        }>;

        const users = rows.map((u) => ({
          id: u.id,
          email: u.email,
          roleId: u.role_id,
          role: u.role_name,
          isActive: Boolean(u.is_active),
          firstName: u.first_name,
          lastName: u.last_name,
        }));

        return apiSuccess(users, `Found ${users.length} results`);
      } finally {
        span.end();
      }
    });
  }

  createUser(input: AdminCreateUserInput): ApiResponse<unknown> {
    return tracer.startActiveSpan('UserService.CreateUser', (span) => {
      try {
        const normalizedEmail = input.email.trim().toLowerCase();
        const existing = this.db
          .prepare('SELECT id FROM Users WHERE email = ?')
          .get(normalizedEmail) as { id: number } | undefined;

        if (existing) {
          return apiError('Email already registered', 409);
        }

        const role = this.db
          .prepare('SELECT id, name FROM Roles WHERE id = ?')
          .get(input.roleId) as { id: number; name: UserRole } | undefined;

        if (!role) {
          return apiError('Invalid role', 400);
        }

        const now = new Date().toISOString();
        const passwordHash = bcrypt.hashSync(input.password, 10);
        const firstName = input.firstName.trim();
        const lastName = input.lastName.trim();

        this.db.exec('BEGIN IMMEDIATE');
        try {
          const userResult = this.db
            .prepare(
              'INSERT INTO Users (email, password_hash, role_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
            .run(normalizedEmail, passwordHash, input.roleId, 1, now, now);

          const userId = Number(userResult.lastInsertRowid);

          this.db
            .prepare(
              'INSERT INTO Profiles (user_id, first_name, last_name, updated_at) VALUES (?, ?, ?, ?)'
            )
            .run(userId, firstName, lastName, now);

          this.db.exec('COMMIT');
          span.setAttribute('user.id', userId);

          return apiSuccess(
            [
              {
                id: userId,
                email: normalizedEmail,
                roleId: input.roleId,
                role: role.name,
                isActive: true,
                profile: {
                  firstName,
                  lastName,
                },
                createdAt: now,
              },
            ],
            'User created successfully',
            201
          );
        } catch (err) {
          this.db.exec('ROLLBACK');
          throw err;
        }
      } finally {
        span.end();
      }
    });
  }

  changePassword(id: number, input: ChangePasswordInput): ApiResponse<unknown> {
    const user = this.db
      .prepare('SELECT id, password_hash FROM Users WHERE id = ?')
      .get(id) as { id: number; password_hash: string } | undefined;

    if (!user) {
      return apiError('User not found', 404);
    }

    if (!bcrypt.compareSync(input.currentPassword, user.password_hash)) {
      return apiError('Current password is incorrect', 400);
    }

    const nextHash = bcrypt.hashSync(input.newPassword, 10);
    const now = new Date().toISOString();

    this.db
      .prepare('UPDATE Users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(nextHash, now, id);

    return apiSuccess([{ id: user.id, message: 'Password changed' }], 'Password changed successfully');
  }

  updateProfile(id: number, input: UpdateProfileInput): ApiResponse<unknown> {
    const profile = this.db
      .prepare(
        'SELECT user_id, first_name, last_name, phone, address, city, country, avatar_url, date_of_birth FROM Profiles WHERE user_id = ?'
      )
      .get(id) as
      | {
          user_id: number;
          first_name: string;
          last_name: string;
          phone: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          avatar_url: string | null;
          date_of_birth: string | null;
        }
      | undefined;

    if (!profile) {
      return apiError('Profile not found', 404);
    }

    const firstName = input.firstName != null ? input.firstName.trim() : profile.first_name;
    const lastName = input.lastName != null ? input.lastName.trim() : profile.last_name;
    const phone = input.phone != null ? input.phone.trim() : profile.phone;
    const address = input.address != null ? input.address.trim() : profile.address;
    const city = input.city != null ? input.city.trim() : profile.city;
    const country = input.country != null ? input.country.trim() : profile.country;
    const avatarUrl = input.avatarUrl != null ? input.avatarUrl.trim() : profile.avatar_url;
    const dateOfBirth = input.dateOfBirth != null ? input.dateOfBirth : profile.date_of_birth;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE Profiles
         SET first_name = ?, last_name = ?, phone = ?, address = ?, city = ?, country = ?, avatar_url = ?, date_of_birth = ?, updated_at = ?
         WHERE user_id = ?`
      )
      .run(firstName, lastName, phone, address, city, country, avatarUrl, dateOfBirth, now, id);

    return apiSuccess(
      [
        {
          userId: id,
          firstName,
          lastName,
          phone,
          address,
          city,
          country,
        },
      ],
      'Profile updated successfully'
    );
  }

  updateStatus(id: number, isActive: boolean, actingUserId: number): ApiResponse<unknown> {
    if (id === actingUserId && !isActive) {
      return apiError('You cannot deactivate your own active administrator session', 400);
    }

    const user = this.db
      .prepare('SELECT id FROM Users WHERE id = ?')
      .get(id) as { id: number } | undefined;

    if (!user) {
      return apiError('User not found', 404);
    }

    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE Users SET is_active = ?, updated_at = ? WHERE id = ?')
      .run(isActive ? 1 : 0, now, id);

    return apiSuccess(
      [{ id, isActive }],
      isActive ? 'Account activated successfully' : 'Account deactivated successfully'
    );
  }

  updateRole(id: number, roleId: number, actingUserId: number): ApiResponse<unknown> {
    if (id === actingUserId && roleId !== 1) {
      return apiError('You cannot remove your own Admin role', 400);
    }

    const user = this.db
      .prepare('SELECT id FROM Users WHERE id = ?')
      .get(id) as { id: number } | undefined;

    if (!user) {
      return apiError('User not found', 404);
    }

    const role = this.db
      .prepare('SELECT id, name FROM Roles WHERE id = ?')
      .get(roleId) as { id: number; name: UserRole } | undefined;

    if (!role) {
      return apiError('Invalid role', 400);
    }

    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE Users SET role_id = ?, updated_at = ? WHERE id = ?')
      .run(roleId, now, id);

    return apiSuccess(
      [{ id, roleId, role: role.name }],
      'User role updated successfully'
    );
  }

  deactivate(id: number): ApiResponse<unknown> {
    const user = this.db
      .prepare('SELECT id FROM Users WHERE id = ?')
      .get(id) as { id: number } | undefined;

    if (!user) {
      return apiError('User not found', 404);
    }

    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE Users SET is_active = 0, updated_at = ? WHERE id = ?')
      .run(now, id);

    return apiSuccess([{ id, isActive: false }], 'Account deactivated successfully');
  }
}
