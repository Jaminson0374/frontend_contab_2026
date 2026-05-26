import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import type { CollectionEntry, LogContactRequest } from '../models/collection.model';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/collections';

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly statusFilter = signal('');
  readonly clientId = signal('');

  private buildParams(page: number, size: number, status?: string, clientId?: string): string {
    const params = new URLSearchParams({ page: `${page}`, size: `${size}` });
    if (status) params.set('status', status);
    if (clientId) params.set('clientId', clientId);
    return params.toString();
  }

  readonly collections = httpResource<PageResponse<CollectionEntry>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildParams(this.page(), this.pageSize(), this.statusFilter() || undefined, this.clientId() || undefined)}`;
  });

  logContact(id: string, request: LogContactRequest): Observable<CollectionEntry> {
    return this.http.post<CollectionEntry>(`${this.base}/${id}/contact`, request);
  }

  reload(): void {
    this.collections.reload();
  }
}
