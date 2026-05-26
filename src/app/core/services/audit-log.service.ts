import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { untracked } from '@angular/core';
import { PageResponse } from '../models/page.model';
import { AuditLog } from '../models/audit-log.model';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/admin/audit-logs';

  readonly page = signal(0);
  readonly size = signal(20);
  readonly entityType = signal<string | null>(null);
  readonly userId = signal<string | null>(null);
  readonly action = signal<string | null>(null);
  readonly from = signal<string | null>(null);
  readonly to = signal<string | null>(null);

  private buildParams(): string {
    const params = new URLSearchParams({
      page: `${this.page()}`,
      size: `${this.size()}`,
    });

    // Use untracked to avoid triggering on every filter change individually
    const entity = untracked(this.entityType);
    if (entity) params.set('entityType', entity);

    const uid = untracked(this.userId);
    if (uid) params.set('userId', uid);

    const act = untracked(this.action);
    if (act) params.set('action', act);

    const f = untracked(this.from);
    if (f) params.set('from', f);

    const t = untracked(this.to);
    if (t) params.set('to', t);

    return params.toString();
  }

  readonly auditLogs = httpResource<PageResponse<AuditLog>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildParams()}`;
  });

  reload(): void {
    this.auditLogs.reload();
  }

  setFilter(
    entityType: string | null,
    userId: string | null,
    action: string | null,
    from: string | null,
    to: string | null,
  ): void {
    this.entityType.set(entityType);
    this.userId.set(userId);
    this.action.set(action);
    this.from.set(from);
    this.to.set(to);
    this.page.set(0);
  }
}
