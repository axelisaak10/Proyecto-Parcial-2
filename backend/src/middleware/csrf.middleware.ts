import type { NextFunction, Request, Response } from 'express';
import { apiError } from '../types/api-response';
import { AUTH_COOKIE_NAME } from './auth.middleware';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PUBLIC_AUTH_PATHS = new Set(['/api/auth/login', '/api/auth/register']);

export function csrfCookieProtectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (MUTATING_METHODS.has(req.method.toUpperCase())) {
    const reqPath = req.path.toLowerCase();
    if (!PUBLIC_AUTH_PATHS.has(reqPath)) {
      const authHeader = req.headers.authorization || '';
      const hasBearerToken = authHeader.toLowerCase().startsWith('bearer ');
      const hasAuthCookie = Boolean(req.cookies?.[AUTH_COOKIE_NAME]);

      if (!hasBearerToken && hasAuthCookie) {
        const requestedWith = String(req.headers['x-requested-with'] || '');
        if (requestedWith.toLowerCase() !== 'xmlhttprequest') {
          res.status(403).json(apiError('Missing CSRF protection header', 403));
          return;
        }
      }
    }
  }

  next();
}
