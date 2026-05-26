import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import { Payment, PaymentRequest } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/payments';

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly query = signal('');
  readonly supplierId = signal<string | null>(null);

  private buildParams(page: number, size: number, q?: string, supplierId?: string | null): string {
    const params = new URLSearchParams({ page: `${page}`, size: `${size}` });
    if (q?.trim()) params.set('q', q.trim());
    if (supplierId) params.set('supplierId', supplierId);
    return params.toString();
  }

  readonly pagos = httpResource<PageResponse<Payment>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildParams(this.page(), this.pageSize(), this.query(), this.supplierId())}`;
  });

  reload(): void {
    this.pagos.reload();
  }

  create(request: PaymentRequest): Observable<Payment> {
    return this.http.post<Payment>(this.base, request);
  }

  getBySupplier(supplierId: string, page = 0, size = 20): Observable<PageResponse<Payment>> {
    return this.http.get<PageResponse<Payment>>(
      `${this.base}?supplierId=${supplierId}&page=${page}&size=${size}`,
    );
  }
}
