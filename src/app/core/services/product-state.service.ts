import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductState } from '../models/product-catalog.model';

@Injectable({ providedIn: 'root' })
export class ProductStateService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = '/api/v1/product-states';

  readonly states = httpResource<ProductState[]>(() =>
    isPlatformBrowser(this.platformId) ? this.base : undefined
  );

  create(code: string, name: string): Observable<ProductState> {
    return this.http.post<ProductState>(this.base, { code, name });
  }

  reload(): void { this.states.reload(); }
}
