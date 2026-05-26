import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductModel } from '../models/product-catalog.model';

@Injectable({ providedIn: 'root' })
export class ProductModelService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = '/api/v1/product-models';

  readonly brandId = signal<string | null>(null);

  readonly models = httpResource<ProductModel[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const brandId = this.brandId();
    return brandId ? `${this.base}?brandId=${brandId}` : this.base;
  });

  create(name: string, brandId: string | null): Observable<ProductModel> {
    return this.http.post<ProductModel>(this.base, { name, brandId });
  }

  reload(): void { this.models.reload(); }
}
