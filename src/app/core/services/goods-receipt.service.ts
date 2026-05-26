import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { GoodsReceiptRequest, ReceiptResponse } from '../models/goods-receipt.model';
import type { PageResponse } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class GoodsReceiptService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/goods-receipts';

  create(request: GoodsReceiptRequest): Observable<ReceiptResponse> {
    return this.http.post<ReceiptResponse>(this.base, request);
  }

  getByOcId(ocId: string): Observable<PageResponse<ReceiptResponse>> {
    return this.http.get<PageResponse<ReceiptResponse>>(`${this.base}?ocId=${ocId}`);
  }
}
