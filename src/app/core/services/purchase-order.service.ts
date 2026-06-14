import { HttpParams } from '@angular/common/http';
import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import {
  PurchaseOrder,
  PurchaseOrderRequest,
  PurchaseOrderStatus,
} from '../models/purchase-order.model';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/purchase-orders';

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly status = signal<PurchaseOrderStatus | null>(null);
  readonly query = signal('');

  private buildParams(
    page: number,
    size: number,
    status?: PurchaseOrderStatus | null,
    q?: string,
  ): string {
    const params = new URLSearchParams({
      page: `${page}`,
      size: `${size}`,
    });

    if (status) {
      params.set('status', status);
    }
    if (q && q.trim()) {
      params.set('q', q.trim());
    }

    return params.toString();
  }

  readonly ordenes = httpResource<PageResponse<PurchaseOrder>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildParams(this.page(), this.pageSize(), this.status(), this.query())}`;
  });

  getById(id: string): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.base}/${id}`);
  }

  searchByNumber(query: string): Observable<PurchaseOrder[]> {
    return this.http
      .get<PageResponse<PurchaseOrder>>(`${this.base}?q=${encodeURIComponent(query)}&size=10`)
      .pipe(map((r) => r.content));
  }

  create(request: PurchaseOrderRequest): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.base, request);
  }

  update(id: string, request: PurchaseOrderRequest): Observable<PurchaseOrder> {
    return this.http.put<PurchaseOrder>(`${this.base}/${id}`, request);
  }

  cancel(id: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/status?status=CANCELLED`, null);
  }

  reload(): void {
    this.ordenes.reload();
  }
}
