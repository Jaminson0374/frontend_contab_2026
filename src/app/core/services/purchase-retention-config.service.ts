import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PurchaseRetentionConfig,
  PurchaseRetentionConfigRequest,
} from '../models/purchase-retention-config.model';

@Injectable({ providedIn: 'root' })
export class PurchaseRetentionConfigService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/admin/retention-configs';

  listAll(): Observable<PurchaseRetentionConfig[]> {
    return this.http.get<PurchaseRetentionConfig[]>(this.base);
  }

  listActive(): Observable<PurchaseRetentionConfig[]> {
    return this.http.get<PurchaseRetentionConfig[]>(`${this.base}/active`);
  }

  getById(id: string): Observable<PurchaseRetentionConfig> {
    return this.http.get<PurchaseRetentionConfig>(`${this.base}/${id}`);
  }

  create(request: PurchaseRetentionConfigRequest): Observable<PurchaseRetentionConfig> {
    return this.http.post<PurchaseRetentionConfig>(this.base, request);
  }

  update(id: string, request: PurchaseRetentionConfigRequest): Observable<PurchaseRetentionConfig> {
    return this.http.put<PurchaseRetentionConfig>(`${this.base}/${id}`, request);
  }

  toggleActive(id: string): Observable<PurchaseRetentionConfig> {
    return this.http.patch<PurchaseRetentionConfig>(`${this.base}/${id}/toggle`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
