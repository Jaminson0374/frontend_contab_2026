import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyConfigRequest, CompanyConfigResponse } from '../models/company-config.model';

@Injectable({ providedIn: 'root' })
export class CompanyConfigService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/admin/company-config';

  getConfig(): Observable<CompanyConfigResponse> {
    return this.http.get<CompanyConfigResponse>(this.base);
  }

  saveConfig(request: CompanyConfigRequest): Observable<CompanyConfigResponse> {
    return this.http.put<CompanyConfigResponse>(this.base, request);
  }
}
