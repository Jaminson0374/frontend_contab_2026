import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import type { CustomerReceipt, CustomerReceiptRequest } from '../models/customer-receipt.model';

@Injectable({ providedIn: 'root' })
export class CustomerReceiptService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/customer-receipts';

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly clientId = signal('');

  private buildParams(page: number, size: number, clientId?: string): string {
    const params = new URLSearchParams({ page: `${page}`, size: `${size}` });
    if (clientId) params.set('clientId', clientId);
    return params.toString();
  }

  readonly receipts = httpResource<PageResponse<CustomerReceipt>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildParams(this.page(), this.pageSize(), this.clientId() || undefined)}`;
  });

  getById(id: string): Observable<CustomerReceipt> {
    return this.http.get<CustomerReceipt>(`${this.base}/${id}`);
  }

  create(request: CustomerReceiptRequest): Observable<CustomerReceipt> {
    return this.http.post<CustomerReceipt>(this.base, request);
  }

  reload(): void {
    this.receipts.reload();
  }
}
