import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { AccountingTemplate, AccountingTemplateRequest } from '../models/accounting-template.model';

@Injectable({ providedIn: 'root' })
export class AccountingTemplateService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = '/api/v1/accounting-templates';

  readonly module = signal<string | null>(null);

  readonly templates = httpResource<AccountingTemplate[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const mod = this.module();
    return mod != null ? `${this.baseUrl}?module=${mod}` : this.baseUrl;
  });

  getById(id: string) {
    return this.http.get<AccountingTemplate>(`${this.baseUrl}/${id}`);
  }

  create(request: AccountingTemplateRequest) {
    return this.http.post<AccountingTemplate>(this.baseUrl, request);
  }

  update(id: string, request: AccountingTemplateRequest) {
    return this.http.put<AccountingTemplate>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
