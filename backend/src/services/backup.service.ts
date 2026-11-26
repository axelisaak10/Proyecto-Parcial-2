import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { seedDatabase } from '../data/seeder';
import { apiError, apiSuccess, type ApiResponse } from '../types/api-response';

function formatBackupTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}_` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

export class BackupService {
  private readonly resolvedBackupDir: string;

  constructor(
    private readonly db: DatabaseSync,
    private readonly dbPath: string,
    backupDir: string
  ) {
    this.resolvedBackupDir = path.resolve(backupDir);
  }

  backupDatabase(): ApiResponse<unknown> {
    if (this.dbPath !== ':memory:' && !fs.existsSync(this.dbPath)) {
      return apiError('Database file not found', 404);
    }

    fs.mkdirSync(this.resolvedBackupDir, { recursive: true });

    const now = new Date();
    const baseName = `toystore_${formatBackupTimestamp(now)}`;
    let backupFileName = `${baseName}.db`;
    let backupPath = path.join(this.resolvedBackupDir, backupFileName);
    let suffix = 1;
    while (fs.existsSync(backupPath)) {
      backupFileName = `${baseName}_${suffix}.db`;
      backupPath = path.join(this.resolvedBackupDir, backupFileName);
      suffix += 1;
    }

    const escapedPath = backupPath.replace(/'/g, "''");
    this.db.exec(`VACUUM INTO '${escapedPath}'`);

    return apiSuccess(
      [
        {
          backupFile: backupFileName,
          downloadUrl: `/api/admin/backup/${backupFileName}`,
          createdAt: now.toISOString(),
        },
      ],
      'Database backup created successfully'
    );
  }

  listBackups(): ApiResponse<unknown> {
    if (!fs.existsSync(this.resolvedBackupDir)) {
      return apiSuccess([], 'No backups found');
    }

    const files = fs
      .readdirSync(this.resolvedBackupDir)
      .filter((name) => name.endsWith('.db'))
      .map((name) => {
        const fullPath = path.join(this.resolvedBackupDir, name);
        const stat = fs.statSync(fullPath);
        return {
          fileName: name,
          downloadUrl: `/api/admin/backup/${name}`,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.getTime() ? stat.birthtime.toISOString() : stat.mtime.toISOString(),
          sortKey: stat.mtimeMs,
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey)
      .map(({ sortKey: _ignored, ...rest }) => rest);

    return apiSuccess(files, `Found ${files.length} backup(s)`);
  }

  getBackupFilePath(fileName: string): string | null {
    const safeName = path.basename(fileName);
    if (!safeName || safeName !== fileName || !safeName.endsWith('.db')) {
      return null;
    }

    const candidate = path.resolve(this.resolvedBackupDir, safeName);
    if (!candidate.startsWith(`${this.resolvedBackupDir}${path.sep}`)) {
      return null;
    }

    return fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : null;
  }

  clearDatabase(): ApiResponse<unknown> {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.exec('DELETE FROM Profiles;');
      this.db.exec('DELETE FROM Users;');
      this.db.exec('DELETE FROM Products;');
      this.db.exec("DELETE FROM sqlite_sequence WHERE name IN ('Profiles', 'Users', 'Products');");
      seedDatabase(this.db);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }

    return apiSuccess(
      [
        {
          message: 'Database cleared and re-seeded',
          clearedAt: new Date().toISOString(),
        },
      ],
      'Database cleared successfully'
    );
  }
}
