import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { AccountsPayable, ApAgingResponse } from '../models/accounts-payable.model';

@Injectable({ providedIn: 'root' })
export class AccountsPayableService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = '/api/v1/accounts-payable';

  readonly payables = httpResource<AccountsPayable[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return this.baseUrl;
  });

  getById(id: string) {
    return this.http.get<AccountsPayable>(`${this.baseUrl}/${id}`);
  }

  getAging() {
    return this.http.get<ApAgingResponse>(`${this.baseUrl}/aging`);
  }

  markOverdue() {
    return this.http.post<number>(`${this.baseUrl}/mark-overdue`, {});
  }
}
