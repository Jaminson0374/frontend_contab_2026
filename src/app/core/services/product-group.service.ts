import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductGroup } from '../models/product-catalog.model';

@Injectable({ providedIn: 'root' })
export class ProductGroupService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = '/api/v1/product-groups';

  readonly categoryId = signal<string | null>(null);

  readonly groups = httpResource<ProductGroup[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const categoryId = this.categoryId();
    return categoryId ? `${this.base}?categoryId=${categoryId}` : this.base;
  });

  create(name: string, categoryId: string | null): Observable<ProductGroup> {
    return this.http.post<ProductGroup>(this.base, { name, categoryId });
  }

  reload(): void { this.groups.reload(); }
}
