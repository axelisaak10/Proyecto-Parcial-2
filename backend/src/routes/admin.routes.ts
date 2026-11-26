import path from 'node:path';
import { Router } from 'express';
import type { AppConfig } from '../config/env';
import { createRequireAuth, requireRole } from '../middleware/auth.middleware';
import { BackupService } from '../services/backup.service';
import { apiError } from '../types/api-response';

export function createAdminRouter(backupService: BackupService, config: AppConfig): Router {
  const router = Router();
  const requireAuth = createRequireAuth(config);

  router.use(requireAuth, requireRole('Admin'));

  router.post('/backup', (_req, res) => {
    const response = backupService.backupDatabase();
    res.status(response.statusCode).json(response);
  });

  router.get('/backups', (_req, res) => {
    const response = backupService.listBackups();
    res.status(response.statusCode).json(response);
  });

  router.get('/backup/:fileName', (req, res) => {
    const rawFileName = Array.isArray(req.params.fileName)
      ? req.params.fileName[0]
      : req.params.fileName;

    const filePath = rawFileName ? backupService.getBackupFilePath(rawFileName) : null;
    if (!filePath) {
      res.status(404).json(apiError('Backup file not found', 404));
      return;
    }

    res.download(filePath, path.basename(filePath));
  });

  router.delete('/database', (_req, res) => {
    const response = backupService.clearDatabase();
    res.status(response.statusCode).json(response);
  });

  return router;
}
