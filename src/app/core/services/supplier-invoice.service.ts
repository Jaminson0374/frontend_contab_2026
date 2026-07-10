import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import {
  InvoiceStatus,
  SupplierBalance,
  SupplierInvoice,
  SupplierInvoiceRequest,
} from '../models/supplier-invoice.model';

@Injectable({ providedIn: 'root' })
export class SupplierInvoiceService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/supplier-invoices';
  private readonly supplierBase = '/api/v1/suppliers';

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly status = signal<InvoiceStatus | null>(null);
  readonly supplierId = signal<string | null>(null);
  readonly query = signal('');

  private buildParams(
    page: number,
    size: number,
    status?: InvoiceStatus | null,
    supplierId?: string | null,
    q?: string,
  ): string {
    const params = new URLSearchParams({
      page: `${page}`,
      size: `${size}`,
    });

    if (status) {
      params.set('status', status);
    }

    if (supplierId) {
      params.set('supplierId', supplierId);
    }

    if (q && q.trim()) {
      params.set('q', q.trim());
    }

    return params.toString();
  }

  readonly facturas = httpResource<PageResponse<SupplierInvoice>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildParams(this.page(), this.pageSize(), this.status(), this.supplierId(), this.query())}`;
  });

  create(request: SupplierInvoiceRequest): Observable<SupplierInvoice> {
    return this.http.post<SupplierInvoice>(this.base, request);
  }

  getById(id: string): Observable<SupplierInvoice> {
    return this.http.get<SupplierInvoice>(`${this.base}/${id}`);
  }

  getBalance(supplierId: string): Observable<SupplierBalance> {
    return this.http.get<SupplierBalance>(`${this.supplierBase}/${supplierId}/balance`);
  }

  reconcile(id: string): Observable<SupplierInvoice> {
    return this.http.patch<SupplierInvoice>(`${this.base}/${id}/reconcile`, null);
  }

  dispute(id: string, reason?: string): Observable<SupplierInvoice> {
    return this.http.patch<SupplierInvoice>(`${this.base}/${id}/dispute`, { reason });
  }

  reload(): void {
    this.facturas.reload();
  }
}
