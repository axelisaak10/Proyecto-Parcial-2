import { Router, type Request } from 'express';
import type { AppConfig } from '../config/env';
import { AUTH_COOKIE_NAME, createRequireAuth } from '../middleware/auth.middleware';
import { createAuthRateLimiter } from '../middleware/rate-limit.middleware';
import { AuthService } from '../services/auth.service';
import { apiError, apiSuccess } from '../types/api-response';
import { loginSchema, registerSchema } from '../validation/schemas';
import { parseBody } from './route-helpers';

function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const forwarded = req.headers['x-forwarded-proto'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim().toLowerCase() === 'https';
  }
  return false;
}

export function createAuthRouter(authService: AuthService, config: AppConfig): Router {
  const router = Router();
  const requireAuth = createRequireAuth(config);
  const authRateLimiter = createAuthRateLimiter(config.isTest);

  router.post('/register', authRateLimiter, (req, res) => {
    const input = parseBody(registerSchema, req.body, res);
    if (!input) return;

    const response = authService.register(input);
    res.status(response.statusCode).json(response);
  });

  router.post('/login', authRateLimiter, (req, res) => {
    const input = parseBody(loginSchema, req.body, res);
    if (!input) return;

    const response = authService.login(input);
    if (response.statusCode === 200 && Array.isArray(response.data)) {
      const first = response.data[0] as { token?: string } | undefined;
      if (first?.token) {
        res.cookie(AUTH_COOKIE_NAME, first.token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: isHttpsRequest(req),
          path: '/',
          maxAge: Math.round(config.jwtExpiryMinutes * 60_000),
        });
      }
    }

    res.status(response.statusCode).json(response);
  });

  router.get('/me', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json(apiError('Invalid token claims', 401));
      return;
    }
    const response = authService.getMe(req.user.id);
    res.status(response.statusCode).json(response);
  });

  router.post('/logout', (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttpsRequest(req),
      path: '/',
    });
    res.status(200).json(apiSuccess({ loggedOut: true }, 'Logged out successfully'));
  });

  return router;
}
