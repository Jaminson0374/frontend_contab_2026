import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockAdjustment, AdjustmentRequest } from '../models/adjustment.model';
import { PageResponse } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class AdjustmentService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/adjustments';

  create(request: AdjustmentRequest): Observable<StockAdjustment> {
    return this.http.post<StockAdjustment>(this.base, request);
  }

  list(page = 0, size = 20): Observable<PageResponse<StockAdjustment>> {
    return this.http.get<PageResponse<StockAdjustment>>(`${this.base}?page=${page}&size=${size}`);
  }

  findByProduct(productId: string, page = 0, size = 20): Observable<PageResponse<StockAdjustment>> {
    return this.http.get<PageResponse<StockAdjustment>>(
      `${this.base}?productId=${productId}&page=${page}&size=${size}`,
    );
  }
}
