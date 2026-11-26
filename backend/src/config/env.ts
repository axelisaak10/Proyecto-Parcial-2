import path from 'node:path';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  isTest: boolean;
  dbPath: string;
  backupDir: string;
  jwtKey: string;
  jwtIssuer: string;
  jwtAudience: string;
  jwtExpiryMinutes: number;
  corsAllowedOrigins: string[];
  otlpEndpoint: string;
  otlpHeaders: string;
}

const DEFAULT_DEV_JWT_KEY = 'DevOnly_Local_ToyStore_JWT_Key_2026_ChangeInProd!';

export function loadConfig(overrides?: { dbPath?: string; backupDir?: string }): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  let jwtKey = process.env.JWT_KEY?.trim() || '';
  if (!jwtKey) {
    if (isProduction) {
      throw new Error('JWT_KEY must be configured via environment variables in Production.');
    }
    jwtKey = DEFAULT_DEV_JWT_KEY;
  }

  const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

  const parsedExpiry = Number.parseFloat(process.env.JWT_EXPIRY_MINUTES || '60');
  const jwtExpiryMinutes = Number.isFinite(parsedExpiry) && parsedExpiry > 0 ? parsedExpiry : 60;

  const rawOrigins =
    process.env.CORS_ALLOWED_ORIGINS ||
    'http://localhost:4200,http://127.0.0.1:4200,http://localhost:8080,http://127.0.0.1:8080';

  const corsAllowedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port,
    nodeEnv,
    isProduction,
    isTest,
    dbPath: overrides?.dbPath ?? process.env.DB_PATH ?? path.resolve(process.cwd(), 'data', 'toystore.db'),
    backupDir: overrides?.backupDir ?? process.env.BACKUP_DIR ?? path.resolve(process.cwd(), 'backups'),
    jwtKey,
    jwtIssuer: process.env.JWT_ISSUER?.trim() || 'ToyStoreAPI',
    jwtAudience: process.env.JWT_AUDIENCE?.trim() || 'ToyStoreClient',
    jwtExpiryMinutes,
    corsAllowedOrigins,
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || '',
    otlpHeaders: process.env.OTEL_EXPORTER_OTLP_HEADERS?.trim() || '',
  };
}
