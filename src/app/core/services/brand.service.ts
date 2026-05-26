import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Brand } from '../models/product-catalog.model';

@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = '/api/v1/brands';

  readonly brands = httpResource<Brand[]>(() =>
    isPlatformBrowser(this.platformId) ? this.base : undefined
  );

  create(name: string): Observable<Brand> {
    return this.http.post<Brand>(this.base, { name });
  }

  reload(): void {
    this.brands.reload();
  }
}
