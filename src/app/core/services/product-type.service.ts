import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductType } from '../models/product-catalog.model';

@Injectable({ providedIn: 'root' })
export class ProductTypeService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = '/api/v1/product-types';

  readonly types = httpResource<ProductType[]>(() =>
    isPlatformBrowser(this.platformId) ? this.base : undefined
  );

  create(code: string, name: string): Observable<ProductType> {
    return this.http.post<ProductType>(this.base, { code, name });
  }

  reload(): void { this.types.reload(); }
}
