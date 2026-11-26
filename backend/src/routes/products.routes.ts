import { Router } from 'express';
import type { AppConfig } from '../config/env';
import { createRequireAuth, requireRole } from '../middleware/auth.middleware';
import { ProductService } from '../services/product.service';
import { apiError } from '../types/api-response';
import { productSchema } from '../validation/schemas';
import {
  getQueryBool,
  getQueryInt,
  getQueryString,
  parseBody,
  parsePositiveIntParam,
} from './route-helpers';

export function createProductsRouter(productService: ProductService, config: AppConfig): Router {
  const router = Router();
  const requireAuth = createRequireAuth(config);

  router.use(requireAuth);

  router.get('/', (req, res) => {
    const page = getQueryInt(req.query.page, 1);
    const pageSize = getQueryInt(req.query.pageSize, 10);
    const q = getQueryString(req.query.q);
    const category = getQueryString(req.query.category);
    const isActive = getQueryBool(req.query.isActive);

    const response = productService.getAll(page, pageSize, q, category, isActive);
    res.status(response.statusCode).json(response);
  });

  router.get('/:id', (req, res) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      res.status(400).json(apiError('Invalid product ID', 400));
      return;
    }

    const response = productService.getById(id);
    res.status(response.statusCode).json(response);
  });

  router.post('/', requireRole('Admin'), (req, res) => {
    const input = parseBody(productSchema, req.body, res);
    if (!input) return;

    const response = productService.create(input);
    res.status(response.statusCode).json(response);
  });

  router.put('/:id', requireRole('Admin'), (req, res) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      res.status(400).json(apiError('Invalid product ID', 400));
      return;
    }

    const input = parseBody(productSchema, req.body, res);
    if (!input) return;

    const response = productService.update(id, input);
    res.status(response.statusCode).json(response);
  });

  router.delete('/:id', requireRole('Admin'), (req, res) => {
    const id = parsePositiveIntParam(req.params.id);
    if (!id) {
      res.status(400).json(apiError('Invalid product ID', 400));
      return;
    }

    const response = productService.delete(id);
    res.status(response.statusCode).json(response);
  });

  return router;
}
