import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ProductPresentation,
  ProductPresentationRequest,
} from '../models/product-presentation.model';

@Injectable({ providedIn: 'root' })
export class PresentationService {
  private readonly http = inject(HttpClient);

  private base(productId: string): string {
    return `/api/v1/products/${productId}/presentations`;
  }

  list(productId: string): Observable<ProductPresentation[]> {
    return this.http.get<ProductPresentation[]>(this.base(productId));
  }

  create(productId: string, request: ProductPresentationRequest): Observable<ProductPresentation> {
    return this.http.post<ProductPresentation>(this.base(productId), request);
  }

  update(
    productId: string,
    id: string,
    request: ProductPresentationRequest,
  ): Observable<ProductPresentation> {
    return this.http.put<ProductPresentation>(`${this.base(productId)}/${id}`, request);
  }

  delete(productId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(productId)}/${id}`);
  }
}
