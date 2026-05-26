import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { InventoryStock } from '../models/stock.model';

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly base       = '/api/v1/stock';
  private readonly platformId = inject(PLATFORM_ID);

  readonly selectedWarehouseId = signal<string | null>(null);

  readonly stockByWarehouse = httpResource<InventoryStock[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const wid = this.selectedWarehouseId();
    return wid ? `${this.base}/warehouse/${wid}` : undefined;
  });

  readonly stockByBatch = (batchId: string) =>
    httpResource<InventoryStock[]>(() =>
      isPlatformBrowser(this.platformId) ? `${this.base}/batch/${batchId}` : undefined
    );
}
