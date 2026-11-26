import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { LucideActivity, LucideDatabase, LucideDownload, LucideRefreshCw } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { HealthResponse } from '../../core/models/api-response.model';
import { AdminService, BackupListItem, BackupResultItem } from '../../core/services/admin.service';
import { ToastStore } from '../../core/stores/toast.store';
import { BadgeComponent } from '../../shared/components/badge.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DatePipe, BadgeComponent, LucideActivity, LucideDatabase, LucideRefreshCw, LucideDownload],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Administración y Respaldos</h1>
        <p class="text-sm text-[var(--text-secondary)] mt-1">
          Diagnóstico del servicio API y gestión de instantáneas consistentes SQLite.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Health Card -->
        <div class="surface-card p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-[var(--status-success-bg)] text-[var(--status-success)] flex items-center justify-center">
                <svg lucideActivity [size]="18"></svg>
              </div>
              <div>
                <h2 class="text-base font-semibold">Estado de API y Base de Datos</h2>
                <p class="text-xs text-[var(--text-secondary)]">Verificación en vivo (/api/health)</p>
              </div>
            </div>
            <button
              type="button"
              (click)="loadHealth()"
              class="p-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] cursor-pointer focus-ring"
              aria-label="Actualizar salud"
            >
              <svg lucideRefreshCw [size]="16"></svg>
            </button>
          </div>

          @if (health(); as h) {
            <div class="p-4 rounded-xl bg-[var(--bg-subtle)] space-y-2.5 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-[var(--text-secondary)]">Servicio</span>
                <span class="font-mono-code font-medium">{{ h.service }} v{{ h.version }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[var(--text-secondary)]">Estado API</span>
                <app-badge [variant]="h.status === 'ok' ? 'success' : 'warning'" [dot]="true">
                  {{ h.status }}
                </app-badge>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[var(--text-secondary)]">SQLite</span>
                <span class="font-medium">{{ h.database }}</span>
              </div>
            </div>
          }
        </div>

        <!-- Backup Card -->
        <div class="surface-card p-6 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center">
                <svg lucideDatabase [size]="18"></svg>
              </div>
              <div>
                <h2 class="text-base font-semibold">Respaldo SQLite (VACUUM INTO)</h2>
                <p class="text-xs text-[var(--text-secondary)]">Genera una instantánea transaccional segura</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            data-testid="admin-backup-btn"
            [disabled]="backingUp()"
            (click)="runBackup()"
            class="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold transition cursor-pointer disabled:opacity-60 min-h-[44px] focus-ring"
          >
            {{ backingUp() ? 'Generando respaldo...' : 'Generar respaldo ahora' }}
          </button>

          @if (lastBackup(); as b) {
            <div class="p-4 rounded-xl bg-[var(--status-success-bg)] border border-emerald-500/25 text-xs flex items-center justify-between gap-3">
              <div class="space-y-1 min-w-0">
                <p class="font-semibold text-[var(--status-success)]">Respaldo completado</p>
                <p class="font-mono-code truncate">{{ b.backupFile }}</p>
                <p class="text-[var(--text-secondary)]">{{ b.createdAt | date: 'medium' }}</p>
              </div>
              <a
                [href]="b.downloadUrl"
                download
                class="px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] font-semibold inline-flex items-center gap-1.5 shrink-0 transition"
              >
                <svg lucideDownload [size]="14"></svg>
                <span>Descargar</span>
              </a>
            </div>
          }
        </div>
      </div>

      <!-- Backups History Table -->
      <div class="surface-card overflow-hidden">
        <div class="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold">Historial de Instantáneas en Servidor</h2>
            <p class="text-xs text-[var(--text-secondary)]">
              Archivos SQLite disponibles para descarga directa ({{ backups().length }})
            </p>
          </div>
          <button
            type="button"
            (click)="loadBackups()"
            class="p-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] cursor-pointer focus-ring"
            aria-label="Actualizar lista de respaldos"
          >
            <svg lucideRefreshCw [size]="16"></svg>
          </button>
        </div>

        @if (backups().length === 0) {
          <div class="p-8 text-center text-sm text-[var(--text-muted)]">
            Aún no se han generado respaldos manuales en este volumen.
          </div>
        } @else {
          <div class="divide-y divide-[var(--border-default)]">
            @for (item of backups(); track item.fileName) {
              <div class="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-[var(--bg-subtle)]/50 transition">
                <div class="min-w-0">
                  <p class="text-sm font-mono-code font-medium truncate">{{ item.fileName }}</p>
                  <p class="text-xs text-[var(--text-muted)]">
                    {{ item.createdAt | date: 'medium' }} · {{ formatBytes(item.sizeBytes) }}
                  </p>
                </div>
                <a
                  [href]="item.downloadUrl"
                  download
                  class="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-semibold inline-flex items-center gap-1.5 transition focus-ring"
                >
                  <svg lucideDownload [size]="14"></svg>
                  <span>Descargar .db</span>
                </a>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastStore);

  protected readonly health = signal<HealthResponse | null>(null);
  protected readonly backingUp = signal(false);
  protected readonly lastBackup = signal<BackupResultItem | null>(null);
  protected readonly backups = signal<BackupListItem[]>([]);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadHealth(), this.loadBackups()]);
  }

  async loadHealth(): Promise<void> {
    try {
      this.health.set(await firstValueFrom(this.adminService.getHealth()));
    } catch {
      this.toast.error('No se pudo consultar /api/health');
    }
  }

  async loadBackups(): Promise<void> {
    try {
      const resp = await firstValueFrom(this.adminService.listBackups());
      this.backups.set(resp.data ?? []);
    } catch {
      // Non-blocking if empty or unavailable
    }
  }

  async runBackup(): Promise<void> {
    this.backingUp.set(true);
    try {
      const resp = await firstValueFrom(this.adminService.createBackup());
      this.lastBackup.set(resp.data?.[0] ?? null);
      this.toast.success('Respaldo creado', this.lastBackup()?.backupFile);
      await this.loadBackups();
    } catch (err: unknown) {
      const msg = err instanceof HttpErrorResponse ? err.error?.message : null;
      this.toast.error('Error en respaldo', msg || 'No se pudo generar el respaldo.');
    } finally {
      this.backingUp.set(false);
    }
  }

  protected formatBytes(bytes: number): string {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
