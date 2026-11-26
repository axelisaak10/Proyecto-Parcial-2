import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import {
  AdminCreateUserPayload,
  ChangePasswordPayload,
  ManagedUser,
  PaginatedUsersResponse,
  UpdateProfilePayload,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  getAll(page = 1, pageSize = 10, q = '', isActive: boolean | null = null): Observable<ApiResponse<PaginatedUsersResponse>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    if (isActive !== null) {
      params = params.set('isActive', String(isActive));
    }

    return this.http.get<ApiResponse<PaginatedUsersResponse>>('/api/users', { params });
  }

  create(payload: AdminCreateUserPayload): Observable<ApiResponse<ManagedUser[]>> {
    return this.http.post<ApiResponse<ManagedUser[]>>('/api/users', payload);
  }

  updateProfile(id: number, payload: UpdateProfilePayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`/api/users/${id}/profile`, payload);
  }

  changePassword(id: number, payload: ChangePasswordPayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`/api/users/${id}/password`, payload);
  }

  updateStatus(id: number, isActive: boolean): Observable<ApiResponse<unknown>> {
    return this.http.patch<ApiResponse<unknown>>(`/api/users/${id}/status`, { isActive });
  }

  updateRole(id: number, roleId: number): Observable<ApiResponse<unknown>> {
    return this.http.patch<ApiResponse<unknown>>(`/api/users/${id}/role`, { roleId });
  }
}
