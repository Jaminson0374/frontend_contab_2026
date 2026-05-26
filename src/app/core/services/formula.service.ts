import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductFormula } from '../models/product-formula.model';

@Injectable({ providedIn: 'root' })
export class FormulaService {
  private readonly http = inject(HttpClient);

  list(productId: string): Observable<ProductFormula[]> {
    return this.http.get<ProductFormula[]>(`/api/v1/products/${productId}/formulas`);
  }

  add(
    productId: string,
    body: {
      componentProductId: string;
      quantity: number;
      unitOfMeasureId: string | null;
      sequenceNumber: number;
      notes: string | null;
    },
  ): Observable<ProductFormula> {
    return this.http.post<ProductFormula>(`/api/v1/products/${productId}/formulas`, body);
  }

  update(
    productId: string,
    id: string,
    body: {
      quantity: number;
      unitOfMeasureId: string | null;
      sequenceNumber: number;
      notes: string | null;
    },
  ): Observable<ProductFormula> {
    return this.http.put<ProductFormula>(`/api/v1/products/${productId}/formulas/${id}`, body);
  }

  remove(productId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/products/${productId}/formulas/${id}`);
  }
}
