import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { tracer } from '../observability/telemetry';
import { apiError, apiSuccess, type ApiResponse } from '../types/api-response';
import type { ProductInput } from '../validation/schemas';

interface ProductRow {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  stock: number;
  image_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ProductDto {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapProductRow(row: ProductRow): ProductDto {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    category: row.category,
    price: row.price,
    stock: row.stock,
    imageUrl: row.image_url,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductService {
  constructor(private readonly db: DatabaseSync) {}

  getAll(
    page: number,
    pageSize: number,
    q?: string | null,
    category?: string | null,
    isActive?: boolean | null
  ): ApiResponse<unknown> {
    return tracer.startActiveSpan('ProductService.GetAll', (span) => {
      try {
        const safePage = page < 1 ? 1 : page;
        const safePageSize = Math.min(Math.max(pageSize, 1), 100);

        const whereClauses: string[] = [];
        const params: SQLInputValue[] = [];

        if (q && q.trim()) {
          const term = `%${q.trim().toLowerCase()}%`;
          whereClauses.push(
            "(LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(category) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?)"
          );
          params.push(term, term, term, term);
        }

        if (category && category.trim() && category.trim().toLowerCase() !== 'all') {
          whereClauses.push('LOWER(category) = ?');
          params.push(category.trim().toLowerCase());
        }

        if (typeof isActive === 'boolean') {
          whereClauses.push('is_active = ?');
          params.push(isActive ? 1 : 0);
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countRow = this.db
          .prepare(`SELECT COUNT(*) AS total FROM Products ${whereSql}`)
          .get(...params) as { total: number };

        const offset = (safePage - 1) * safePageSize;
        const rows = this.db
          .prepare(
            `SELECT id, sku, name, description, category, price, stock, image_url, is_active, created_at, updated_at
             FROM Products
             ${whereSql}
             ORDER BY updated_at DESC, id ASC
             LIMIT ? OFFSET ?`
          )
          .all(...params, safePageSize, offset) as unknown as ProductRow[];

        const allRows = this.db
          .prepare('SELECT category, price, stock, is_active FROM Products')
          .all() as unknown as Array<{
          category: string;
          price: number;
          stock: number;
          is_active: number;
        }>;

        const categoryMap = new Map<string, string>();
        for (const item of allRows) {
          const trimmed = item.category?.trim();
          if (trimmed && !categoryMap.has(trimmed.toLowerCase())) {
            categoryMap.set(trimmed.toLowerCase(), trimmed);
          }
        }
        const categories = Array.from(categoryMap.values()).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        let activeProducts = 0;
        let lowStockCount = 0;
        let inventorySum = 0;

        for (const item of allRows) {
          if (item.is_active) {
            activeProducts += 1;
            if (item.stock <= 10) {
              lowStockCount += 1;
            }
            inventorySum += item.price * item.stock;
          }
        }

        const stats = {
          totalProducts: allRows.length,
          activeProducts,
          lowStockCount,
          totalInventoryValue: Math.round(inventorySum * 100) / 100,
        };

        span.setAttribute('products.total', countRow.total);

        return apiSuccess(
          {
            total: countRow.total,
            page: safePage,
            pageSize: safePageSize,
            categories,
            stats,
            products: rows.map(mapProductRow),
          },
          'Products retrieved successfully'
        );
      } finally {
        span.end();
      }
    });
  }

  getById(id: number): ApiResponse<unknown> {
    return tracer.startActiveSpan('ProductService.GetById', (span) => {
      try {
        span.setAttribute('product.id', id);

        const row = this.db
          .prepare(
            `SELECT id, sku, name, description, category, price, stock, image_url, is_active, created_at, updated_at
             FROM Products WHERE id = ?`
          )
          .get(id) as ProductRow | undefined;

        if (!row) {
          return apiError('Product not found', 404);
        }

        return apiSuccess([mapProductRow(row)], 'Product retrieved successfully');
      } finally {
        span.end();
      }
    });
  }

  create(input: ProductInput): ApiResponse<unknown> {
    return tracer.startActiveSpan('ProductService.Create', (span) => {
      try {
        const normalizedSku = input.sku.trim().toUpperCase();
        span.setAttribute('product.sku', normalizedSku);

        const duplicate = this.db
          .prepare('SELECT id FROM Products WHERE UPPER(sku) = ?')
          .get(normalizedSku) as { id: number } | undefined;

        if (duplicate) {
          return apiError(`Product with SKU '${normalizedSku}' already exists`, 409);
        }

        const now = new Date().toISOString();
        const name = input.name.trim();
        const description = input.description?.trim() ? input.description.trim() : null;
        const category = input.category.trim();
        const price = Math.round(input.price * 100) / 100;
        const stock = input.stock;
        const imageUrl = input.imageUrl?.trim() ? input.imageUrl.trim() : null;
        const isActive = input.isActive ? 1 : 0;

        const result = this.db
          .prepare(
            `INSERT INTO Products (sku, name, description, category, price, stock, image_url, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(normalizedSku, name, description, category, price, stock, imageUrl, isActive, now, now);

        const createdId = Number(result.lastInsertRowid);
        span.setAttribute('product.id', createdId);

        const created = this.db
          .prepare(
            'SELECT id, sku, name, description, category, price, stock, image_url, is_active, created_at, updated_at FROM Products WHERE id = ?'
          )
          .get(createdId) as unknown as ProductRow;

        return apiSuccess([mapProductRow(created)], 'Product created successfully', 201);
      } finally {
        span.end();
      }
    });
  }

  update(id: number, input: ProductInput): ApiResponse<unknown> {
    return tracer.startActiveSpan('ProductService.Update', (span) => {
      try {
        span.setAttribute('product.id', id);

        const existing = this.db
          .prepare('SELECT id FROM Products WHERE id = ?')
          .get(id) as { id: number } | undefined;

        if (!existing) {
          return apiError('Product not found', 404);
        }

        const normalizedSku = input.sku.trim().toUpperCase();
        const duplicate = this.db
          .prepare('SELECT id FROM Products WHERE id != ? AND UPPER(sku) = ?')
          .get(id, normalizedSku) as { id: number } | undefined;

        if (duplicate) {
          return apiError(`Product with SKU '${normalizedSku}' already exists`, 409);
        }

        const now = new Date().toISOString();
        const name = input.name.trim();
        const description = input.description?.trim() ? input.description.trim() : null;
        const category = input.category.trim();
        const price = Math.round(input.price * 100) / 100;
        const stock = input.stock;
        const imageUrl = input.imageUrl?.trim() ? input.imageUrl.trim() : null;
        const isActive = input.isActive ? 1 : 0;

        this.db
          .prepare(
            `UPDATE Products
             SET sku = ?, name = ?, description = ?, category = ?, price = ?, stock = ?, image_url = ?, is_active = ?, updated_at = ?
             WHERE id = ?`
          )
          .run(normalizedSku, name, description, category, price, stock, imageUrl, isActive, now, id);

        const updated = this.db
          .prepare(
            'SELECT id, sku, name, description, category, price, stock, image_url, is_active, created_at, updated_at FROM Products WHERE id = ?'
          )
          .get(id) as unknown as ProductRow;

        return apiSuccess([mapProductRow(updated)], 'Product updated successfully');
      } finally {
        span.end();
      }
    });
  }

  delete(id: number): ApiResponse<unknown> {
    return tracer.startActiveSpan('ProductService.Delete', (span) => {
      try {
        span.setAttribute('product.id', id);

        const existing = this.db
          .prepare('SELECT id, sku FROM Products WHERE id = ?')
          .get(id) as { id: number; sku: string } | undefined;

        if (!existing) {
          return apiError('Product not found', 404);
        }

        this.db.prepare('DELETE FROM Products WHERE id = ?').run(id);

        return apiSuccess(
          [{ id: existing.id, sku: existing.sku, deleted: true }],
          'Product deleted successfully'
        );
      } finally {
        span.end();
      }
    });
  }
}
