import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WarehouseLocation } from '../models/product-catalog.model';

@Injectable({ providedIn: 'root' })
export class WarehouseLocationService {
  private readonly base = '/api/v1/warehouse-locations';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);

  readonly warehouseId = signal<string | null>(null);

  readonly locations = httpResource<WarehouseLocation[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const wid = this.warehouseId();
    return wid ? `${this.base}?warehouseId=${wid}` : undefined;
  });

  reload(): void {
    this.locations.reload();
  }

  getByWarehouseId(warehouseId: string): Observable<WarehouseLocation[]> {
    return this.http.get<WarehouseLocation[]>(
      `${this.base}?warehouseId=${encodeURIComponent(warehouseId)}`,
    );
  }

  create(warehouseId: string, name: string, description?: string): Observable<WarehouseLocation> {
    return this.http.post<WarehouseLocation>(this.base, {
      warehouseId,
      name,
      description: description?.trim() ? description.trim() : null,
    });
  }
}
