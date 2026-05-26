import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { untracked } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import { Advance, AdvanceRequest, ApplyAdvanceRequest } from '../models/advance.model';

@Injectable({ providedIn: 'root' })
export class AdvanceService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/payments/advances';

  readonly page = signal(0);
  readonly size = signal(20);
  readonly supplierId = signal<string | null>(null);

  private buildParams(): string {
    const params = new URLSearchParams({
      page: `${untracked(this.page)}`,
      size: `${untracked(this.size)}`,
    });
    const sid = untracked(this.supplierId);
    if (sid) params.set('supplierId', sid);
    return params.toString();
  }

  readonly advances = httpResource<PageResponse<Advance>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildParams()}`;
  });

  create(request: AdvanceRequest): Observable<Advance> {
    return this.http.post<Advance>(this.base, request);
  }

  apply(request: ApplyAdvanceRequest): Observable<Advance> {
    return this.http.post<Advance>(`${this.base}/${request.advancePaymentId}/apply`, request);
  }

  reload(): void {
    this.advances.reload();
  }
}
