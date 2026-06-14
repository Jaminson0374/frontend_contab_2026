import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { GoodsReceiptRequest, GoodsReceipt } from '../models/goods-receipt.model';
import type { PageResponse } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class GoodsReceiptService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/goods-receipts';

  create(request: GoodsReceiptRequest): Observable<GoodsReceipt> {
    return this.http.post<GoodsReceipt>(this.base, request);
  }

  list(page: number, size: number): Observable<PageResponse<GoodsReceipt>> {
    return this.http.get<PageResponse<GoodsReceipt>>(`${this.base}?page=${page}&size=${size}`);
  }

  getByOcId(ocId: string): Observable<PageResponse<GoodsReceipt>> {
    return this.http.get<PageResponse<GoodsReceipt>>(`${this.base}?ocId=${ocId}`);
  }

  getById(id: string): Observable<GoodsReceipt> {
    return this.http.get<GoodsReceipt>(`${this.base}/${id}`);
  }
}
