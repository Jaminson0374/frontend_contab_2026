import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventoryMovement, KardexQuery } from '../models/kardex.model';
import { PageResponse } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class KardexService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/kardex';

  search(query: KardexQuery): Observable<PageResponse<InventoryMovement>> {
    const params = new URLSearchParams();
    if (query.productId) params.set('productId', query.productId);
    if (query.batchId) params.set('batchId', query.batchId);
    if (query.warehouseId) params.set('warehouseId', query.warehouseId);
    if (query.movementType) params.set('movementType', query.movementType);
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    params.set('page', String(query.page ?? 0));
    params.set('size', String(query.size ?? 20));
    return this.http.get<PageResponse<InventoryMovement>>(`${this.base}?${params.toString()}`);
  }
}
