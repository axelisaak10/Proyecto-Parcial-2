import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { DatabaseSync } from 'node:sqlite';
import type { AppConfig } from '../config/env';
import type { UserRole } from '../middleware/auth.middleware';
import { tracer } from '../observability/telemetry';
import { apiError, apiSuccess, type ApiResponse } from '../types/api-response';
import type { LoginInput, RegisterInput } from '../validation/schemas';

interface UserLoginRow {
  id: number;
  email: string;
  password_hash: string;
  is_active: number;
  role_name: UserRole;
  first_name: string | null;
  last_name: string | null;
}

interface UserMeRow {
  id: number;
  email: string;
  is_active: number;
  role_name: UserRole;
  created_at: string;
  updated_at: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
}

export class AuthService {
  constructor(
    private readonly db: DatabaseSync,
    private readonly config: AppConfig
  ) {}

  register(input: RegisterInput): ApiResponse<unknown> {
    return tracer.startActiveSpan('AuthService.Register', (span) => {
      try {
        const normalizedEmail = input.email.trim().toLowerCase();
        const existing = this.db
          .prepare('SELECT id FROM Users WHERE email = ?')
          .get(normalizedEmail) as { id: number } | undefined;

        if (existing) {
          return apiError('Email already registered', 409);
        }

        const now = new Date().toISOString();
        const passwordHash = bcrypt.hashSync(input.password, 10);

        this.db.exec('BEGIN IMMEDIATE');
        try {
          const userResult = this.db
            .prepare(
              'INSERT INTO Users (email, password_hash, role_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
            .run(normalizedEmail, passwordHash, 2, 1, now, now);

          const userId = Number(userResult.lastInsertRowid);

          this.db
            .prepare(
              'INSERT INTO Profiles (user_id, first_name, last_name, updated_at) VALUES (?, ?, ?, ?)'
            )
            .run(userId, input.firstName.trim(), input.lastName.trim(), now);

          this.db.exec('COMMIT');
          span.setAttribute('user.id', userId);

          return apiSuccess(
            [{ id: userId, email: normalizedEmail }],
            'User registered successfully',
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

  login(input: LoginInput): ApiResponse<unknown> {
    return tracer.startActiveSpan('AuthService.Login', (span) => {
      try {
        const normalizedEmail = input.email.trim().toLowerCase();
        const user = this.db
          .prepare(
            `SELECT u.id, u.email, u.password_hash, u.is_active, r.name AS role_name,
                    p.first_name, p.last_name
             FROM Users u
             JOIN Roles r ON r.id = u.role_id
             LEFT JOIN Profiles p ON p.user_id = u.id
             WHERE u.email = ?`
          )
          .get(normalizedEmail) as UserLoginRow | undefined;

        if (!user || !bcrypt.compareSync(input.password, user.password_hash)) {
          return apiError('Invalid email or password', 401);
        }

        if (!user.is_active) {
          return apiError('Account is deactivated', 403);
        }

        const token = this.generateJwtToken(user.id, user.email, user.role_name);
        const expiresAt = new Date(
          Date.now() + this.config.jwtExpiryMinutes * 60_000
        ).toISOString();

        span.setAttribute('user.id', user.id);
        span.setAttribute('user.role', user.role_name);

        return apiSuccess(
          [
            {
              token,
              expiresAt,
              user: {
                id: user.id,
                email: user.email,
                role: user.role_name,
                firstName: user.first_name,
                lastName: user.last_name,
              },
            },
          ],
          'Login successful'
        );
      } finally {
        span.end();
      }
    });
  }

  getMe(userId: number): ApiResponse<unknown> {
    return tracer.startActiveSpan('AuthService.GetMe', (span) => {
      try {
        span.setAttribute('user.id', userId);

        const row = this.db
          .prepare(
            `SELECT u.id, u.email, u.is_active, r.name AS role_name, u.created_at, u.updated_at,
                    p.first_name, p.last_name, p.phone, p.address, p.city, p.country, p.avatar_url, p.date_of_birth
             FROM Users u
             JOIN Roles r ON r.id = u.role_id
             LEFT JOIN Profiles p ON p.user_id = u.id
             WHERE u.id = ?`
          )
          .get(userId) as UserMeRow | undefined;

        if (!row) {
          return apiError('User not found', 404);
        }

        if (!row.is_active) {
          return apiError('Account is deactivated', 403);
        }

        const profile =
          row.first_name === null && row.last_name === null
            ? null
            : {
                firstName: row.first_name ?? '',
                lastName: row.last_name ?? '',
                phone: row.phone,
                address: row.address,
                city: row.city,
                country: row.country,
                avatarUrl: row.avatar_url,
                dateOfBirth: row.date_of_birth,
              };

        return apiSuccess(
          [
            {
              id: row.id,
              email: row.email,
              role: row.role_name,
              isActive: Boolean(row.is_active),
              firstName: row.first_name,
              lastName: row.last_name,
              profile,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            },
          ],
          'Authenticated user retrieved successfully'
        );
      } finally {
        span.end();
      }
    });
  }

  private generateJwtToken(userId: number, email: string, role: UserRole): string {
    return jwt.sign(
      {
        email,
        role,
      },
      this.config.jwtKey,
      {
        subject: String(userId),
        issuer: this.config.jwtIssuer,
        audience: this.config.jwtAudience,
        expiresIn: Math.round(this.config.jwtExpiryMinutes * 60),
      }
    );
  }
}
