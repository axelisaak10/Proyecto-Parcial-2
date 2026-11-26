import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { DatabaseSync } from 'node:sqlite';
import { loadConfig, type AppConfig } from './config/env';
import { openDatabase } from './data/database';
import { seedDatabase } from './data/seeder';
import { csrfCookieProtectionMiddleware } from './middleware/csrf.middleware';
import {
  createErrorMiddleware,
  observabilityMiddleware,
} from './middleware/observability.middleware';
import { SERVICE_VERSION } from './observability/telemetry';
import { createAdminRouter } from './routes/admin.routes';
import { createAuthRouter } from './routes/auth.routes';
import { createProductsRouter } from './routes/products.routes';
import { createUsersRouter } from './routes/users.routes';
import { AuthService } from './services/auth.service';
import { BackupService } from './services/backup.service';
import { ProductService } from './services/product.service';
import { UserService } from './services/user.service';
import { apiError } from './types/api-response';

export interface AppInstance {
  app: Express;
  db: DatabaseSync;
  config: AppConfig;
  close: () => void;
}

export function createApp(options?: {
  db?: DatabaseSync;
  dbPath?: string;
  backupDir?: string;
}): AppInstance {
  const config = loadConfig({
    dbPath: options?.dbPath,
    backupDir: options?.backupDir,
  });

  const db = options?.db ?? openDatabase(config.dbPath);
  seedDatabase(db);

  const authService = new AuthService(db, config);
  const userService = new UserService(db);
  const productService = new ProductService(db);
  const backupService = new BackupService(db, config.dbPath, config.backupDir);

  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.corsAllowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(observabilityMiddleware);
  app.use(csrfCookieProtectionMiddleware);

  app.get('/api/health', (_req, res) => {
    let dbConnected = false;
    try {
      const row = db.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
      dbConnected = row?.ok === 1;
    } catch {
      dbConnected = false;
    }

    res.status(200).json({
      status: dbConnected ? 'ok' : 'degraded',
      service: 'toystore-api',
      version: SERVICE_VERSION,
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', createAuthRouter(authService, config));
  app.use('/api/users', createUsersRouter(userService, config));
  app.use('/api/products', createProductsRouter(productService, config));
  app.use('/api/admin', createAdminRouter(backupService, config));

  app.use((_req, res) => {
    res.status(404).json(apiError('Endpoint not found', 404));
  });

  app.use(createErrorMiddleware(config.isProduction));

  return {
    app,
    db,
    config,
    close: () => {
      if (!options?.db) {
        db.close();
      }
    },
  };
}
