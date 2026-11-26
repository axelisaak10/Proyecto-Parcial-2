import { Router } from 'express';
import type { AppConfig } from '../config/env';
import { createRequireAuth, requireRole } from '../middleware/auth.middleware';
import { UserService } from '../services/user.service';
import { apiError } from '../types/api-response';
import {
  adminCreateUserSchema,
  changePasswordSchema,
  updateProfileSchema,
  updateRoleSchema,
  updateStatusSchema,
} from '../validation/schemas';
import {
  getQueryBool,
  getQueryInt,
  getQueryString,
  parseBody,
  parsePositiveIntParam,
} from './route-helpers';

export function createUsersRouter(userService: UserService, config: AppConfig): Router {
  const router = Router();
  const requireAuth = createRequireAuth(config);

  router.use(requireAuth);

  router.get('/', requireRole('Admin'), (req, res) => {
    const page = getQueryInt(req.query.page, 1);
    const pageSize = getQueryInt(req.query.pageSize, 10);
    const q = getQueryString(req.query.q);
    const isActive = getQueryBool(req.query.isActive);

    const response = userService.getAll(page, pageSize, q, isActive);
    res.status(response.statusCode).json(response);
  });

  // Registered before /:id so 'search' is not parsed as an id
  router.get('/search', requireRole('Admin'), (req, res) => {
    const q = getQueryString(req.query.q) ?? '';
    if (!q.trim()) {
      res.status(400).json(apiError('Search query is required', 400));
      return;
    }

    const response = userService.search(q);
    res.status(response.statusCode).json(response);
  });

  router.post('/', requireRole('Admin'), (req, res) => {
    const input = parseBody(adminCreateUserSchema, req.body, res);
    if (!input) return;

    const response = userService.createUser(input);
    res.status(response.statusCode).json(response);
  });

  router.get('/:id', (req, res) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      res.status(400).json(apiError('Invalid user ID', 400));
      return;
    }

    if (req.user?.id !== id && req.user?.role !== 'Admin') {
      res.status(403).json(apiError('You can only view your own profile', 403));
      return;
    }

    const response = userService.getById(id);
    res.status(response.statusCode).json(response);
  });

  router.post('/:id/password', (req, res) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      res.status(400).json(apiError('Invalid user ID', 400));
      return;
    }

    if (req.user?.id !== id && req.user?.role !== 'Admin') {
      res.status(403).json(apiError('You can only change your own password', 403));
      return;
    }

    const input = parseBody(changePasswordSchema, req.body, res);
    if (!input) return;

    const response = userService.changePassword(id, input);
    res.status(response.statusCode).json(response);
  });

  router.post('/:id/profile', (req, res) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      res.status(400).json(apiError('Invalid user ID', 400));
      return;
    }

    if (req.user?.id !== id && req.user?.role !== 'Admin') {
      res.status(403).json(apiError('You can only update your own profile', 403));
      return;
    }

    const input = parseBody(updateProfileSchema, req.body, res);
    if (!input) return;

    const response = userService.updateProfile(id, input);
    res.status(response.statusCode).json(response);
  });

  router.patch('/:id/status', requireRole('Admin'), (req, res) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      res.status(400).json(apiError('Invalid user ID', 400));
      return;
    }

    const input = parseBody(updateStatusSchema, req.body, res);
    if (!input) return;

    const response = userService.updateStatus(id, input.isActive, req.user!.id);
    res.status(response.statusCode).json(response);
  });

  router.patch('/:id/role', requireRole('Admin'), (req, res) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      res.status(400).json(apiError('Invalid user ID', 400));
      return;
    }

    const input = parseBody(updateRoleSchema, req.body, res);
    if (!input) return;

    const response = userService.updateRole(id, input.roleId, req.user!.id);
    res.status(response.statusCode).json(response);
  });

  router.delete('/:id', (req, res) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      res.status(400).json(apiError('Invalid user ID', 400));
      return;
    }

    if (req.user?.id !== id && req.user?.role !== 'Admin') {
      res.status(403).json(apiError('You can only deactivate your own account', 403));
      return;
    }

    const response = userService.deactivate(id);
    res.status(response.statusCode).json(response);
  });

  return router;
}
