import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp, type AppInstance } from '../src/app';

export function createTestApp(options?: { useFileDb?: boolean }): {
  instance: AppInstance;
  cleanup: () => void;
} {
  process.env.NODE_ENV = 'test';
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toystore-test-'));
  const backupDir = path.join(tempDir, 'backups');
  const dbPath = options?.useFileDb ? path.join(tempDir, 'toystore.db') : ':memory:';

  const instance = createApp({ dbPath, backupDir });

  return {
    instance,
    cleanup: () => {
      instance.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

export async function loginAs(
  app: AppInstance['app'],
  email: string,
  password: string
): Promise<{ token: string; cookie: string }> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Expected 200 login for ${email}, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
  const setCookie = res.headers['set-cookie'];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : String(setCookie || '');
  return {
    token: res.body.data[0].token as string,
    cookie,
  };
}
