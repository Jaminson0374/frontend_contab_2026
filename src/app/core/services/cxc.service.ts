import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PageResponse } from '../models/page.model';
import { AccountsReceivable, ArAgingResponse } from '../models/cxc.model';

@Injectable({ providedIn: 'root' })
export class CxcService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/accounts-receivable';

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly searchQuery = signal('');
  readonly statusFilter = signal('');
  readonly clientIdFilter = signal('');

  private buildSearchParams(
    page: number,
    size: number,
    search?: string,
    clientId?: string,
    status?: string,
  ): string {
    const params = new URLSearchParams({
      page: `${page}`,
      size: `${size}`,
    });

    if (clientId) {
      params.set('clientId', clientId);
    }
    if (status) {
      params.set('status', status);
    }
    if (search) {
      params.set('search', search);
    }

    return params.toString();
  }

  readonly accounts = httpResource<PageResponse<AccountsReceivable>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;

    const params = this.buildSearchParams(
      this.page(),
      this.pageSize(),
      this.searchQuery() || undefined,
      this.clientIdFilter() || undefined,
      this.statusFilter() || undefined,
    );

    return `${this.base}?${params}`;
  });

  getById(id: string): Observable<AccountsReceivable> {
    return this.http.get<AccountsReceivable>(`${this.base}/${id}`);
  }

  getAging(asOf?: string): Observable<ArAgingResponse> {
    const params = asOf ? `?asOf=${asOf}` : '';
    return this.http.get<ArAgingResponse>(`${this.base}/aging${params}`);
  }

  list(
    page: number,
    size: number,
    clientId?: string,
    status?: string,
  ): Observable<PageResponse<AccountsReceivable>> {
    const params = this.buildSearchParams(page, size, undefined, clientId, status);
    return this.http.get<PageResponse<AccountsReceivable>>(`${this.base}?${params}`);
  }

  reload(): void {
    this.accounts.reload();
  }
}
