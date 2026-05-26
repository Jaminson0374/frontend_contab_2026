import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PriceList } from '../models/product-catalog.model';

@Injectable({ providedIn: 'root' })
export class PriceListService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/price-lists';

  readonly priceLists = httpResource<PriceList[]>(() =>
    isPlatformBrowser(this.platformId) ? this.base : undefined,
  );

  create(code: string, name: string, description?: string): Observable<PriceList> {
    return this.http.post<PriceList>(this.base, {
      code: code.trim(),
      name: name.trim(),
      description: description?.trim() ? description.trim() : null,
    });
  }

  update(id: string, code: string, name: string, description?: string): Observable<PriceList> {
    return this.http.put<PriceList>(`${this.base}/${id}`, {
      code: code.trim(),
      name: name.trim(),
      description: description?.trim() ? description.trim() : null,
    });
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  reload(): void {
    this.priceLists.reload();
  }
}
