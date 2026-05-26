import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductCatalogCategory } from '../models/product-catalog.model';

@Injectable({ providedIn: 'root' })
export class ProductCatalogCategoryService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = '/api/v1/product-categories';

  readonly categories = httpResource<ProductCatalogCategory[]>(() =>
    isPlatformBrowser(this.platformId) ? this.base : undefined
  );

  create(name: string): Observable<ProductCatalogCategory> {
    return this.http.post<ProductCatalogCategory>(this.base, { name });
  }

  reload(): void {
    this.categories.reload();
  }
}
