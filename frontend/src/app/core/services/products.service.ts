import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { PaginatedProductsResponse, Product, ProductPayload } from '../models/product.model';

export interface ProductQueryParams {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  isActive?: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  getAll(query: ProductQueryParams = {}): Observable<ApiResponse<PaginatedProductsResponse>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 10));

    if (query.q && query.q.trim()) {
      params = params.set('q', query.q.trim());
    }
    if (query.category && query.category !== 'all') {
      params = params.set('category', query.category);
    }
    if (query.isActive !== null && query.isActive !== undefined) {
      params = params.set('isActive', String(query.isActive));
    }

    return this.http.get<ApiResponse<PaginatedProductsResponse>>('/api/products', { params });
  }

  getById(id: number): Observable<ApiResponse<Product[]>> {
    return this.http.get<ApiResponse<Product[]>>(`/api/products/${id}`);
  }

  create(payload: ProductPayload): Observable<ApiResponse<Product[]>> {
    return this.http.post<ApiResponse<Product[]>>('/api/products', payload);
  }

  update(id: number, payload: ProductPayload): Observable<ApiResponse<Product[]>> {
    return this.http.put<ApiResponse<Product[]>>(`/api/products/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`/api/products/${id}`);
  }
}
