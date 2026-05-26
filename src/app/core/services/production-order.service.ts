import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  ProductionOrder,
  ProductionOrderRequest,
  ProductionOrderPage,
} from '../models/production-order.model';

@Injectable({ providedIn: 'root' })
export class ProductionOrderService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/production-orders';

  list(
    params: {
      page?: number;
      size?: number;
      status?: string;
      warehouseId?: string;
      from?: string;
      to?: string;
    } = {},
  ): Observable<ProductionOrderPage> {
    const p = new URLSearchParams();
    p.set('page', String(params.page ?? 0));
    p.set('size', String(params.size ?? 20));
    if (params.status) p.set('status', params.status);
    if (params.warehouseId) p.set('warehouseId', params.warehouseId);
    if (params.from) p.set('from', params.from);
    if (params.to) p.set('to', params.to);
    return this.http.get<ProductionOrderPage>(`${this.base}?${p.toString()}`);
  }

  getById(id: string): Observable<ProductionOrder> {
    return this.http.get<ProductionOrder>(`${this.base}/${id}`);
  }

  create(request: ProductionOrderRequest): Observable<ProductionOrder> {
    return this.http.post<ProductionOrder>(this.base, request);
  }

  approve(id: string): Observable<ProductionOrder> {
    return this.http.post<ProductionOrder>(`${this.base}/${id}/approve`, {});
  }

  cancel(id: string): Observable<ProductionOrder> {
    return this.http.post<ProductionOrder>(`${this.base}/${id}/cancel`, {});
  }
}
