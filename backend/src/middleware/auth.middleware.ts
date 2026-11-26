import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AppConfig } from '../config/env';
import { apiError } from '../types/api-response';

export const AUTH_COOKIE_NAME = 'toystore_auth';

export type UserRole = 'Admin' | 'Customer';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface JwtPayloadClaims {
  sub?: string;
  email?: string;
  role?: UserRole;
}

export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }

  return null;
}

export function createRequireAuth(config: AppConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = extractAuthToken(req);
    if (!token) {
      res.status(401).json(apiError('Authentication required', 401));
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwtKey, {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      }) as JwtPayloadClaims;

      const userId = Number.parseInt(decoded.sub ?? '', 10);
      if (!Number.isFinite(userId) || userId <= 0 || !decoded.email || !decoded.role) {
        res.status(401).json(apiError('Invalid token claims', 401));
        return;
      }

      req.user = {
        id: userId,
        email: decoded.email,
        role: decoded.role,
      };
      next();
    } catch {
      res.status(401).json(apiError('Invalid or expired token', 401));
    }
  };
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(apiError('Authentication required', 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json(apiError('Insufficient permissions', 403));
      return;
    }
    next();
  };
}
