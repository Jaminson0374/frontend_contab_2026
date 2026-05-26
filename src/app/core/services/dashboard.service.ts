import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import type { DashboardSummary } from '../models/dashboard.model';
import type { PageResponse } from '../models/page.model';
import type { AuditLog } from '../models/audit-log.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly summary = httpResource<DashboardSummary>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return '/api/v1/dashboard/summary';
  });

  readonly recentActivity = httpResource<PageResponse<AuditLog>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return '/api/v1/admin/audit-logs?page=0&size=5';
  });
}
