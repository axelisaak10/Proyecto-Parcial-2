import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, HealthResponse } from '../models/api-response.model';

export interface BackupResultItem {
  backupFile: string;
  downloadUrl: string;
  createdAt: string;
}

export interface BackupListItem {
  fileName: string;
  downloadUrl: string;
  sizeBytes: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  getHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>('/api/health');
  }

  createBackup(): Observable<ApiResponse<BackupResultItem[]>> {
    return this.http.post<ApiResponse<BackupResultItem[]>>('/api/admin/backup', {});
  }

  listBackups(): Observable<ApiResponse<BackupListItem[]>> {
    return this.http.get<ApiResponse<BackupListItem[]>>('/api/admin/backups');
  }
}
