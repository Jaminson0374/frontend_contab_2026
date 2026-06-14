import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type {
  PurchaseReturnRequest,
  PurchaseReturnResponse,
} from '../models/purchase-return.model';
import type { PageResponse } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class PurchaseReturnService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/purchase-returns';

  create(request: PurchaseReturnRequest): Observable<PurchaseReturnResponse> {
    return this.http.post<PurchaseReturnResponse>(this.base, request);
  }

  list(page: number, size: number): Observable<PageResponse<PurchaseReturnResponse>> {
    return this.http.get<PageResponse<PurchaseReturnResponse>>(
      `${this.base}?page=${page}&size=${size}`,
    );
  }

  getByReceiptId(receiptId: string): Observable<PurchaseReturnResponse> {
    return this.http.get<PurchaseReturnResponse>(`${this.base}?receiptId=${receiptId}`);
  }

  getById(id: string): Observable<PurchaseReturnResponse> {
    return this.http.get<PurchaseReturnResponse>(`${this.base}/${id}`);
  }
}
