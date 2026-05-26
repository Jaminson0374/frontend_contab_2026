import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomPrice, CustomPriceRequest } from '../models/custom-price.model';

@Injectable({ providedIn: 'root' })
export class CustomPriceService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/admin/custom-prices';

  list(clientId?: string, productId?: string): Observable<CustomPrice[]> {
    const params: string[] = [];
    if (clientId) params.push(`clientId=${clientId}`);
    if (productId) params.push(`productId=${productId}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<CustomPrice[]>(`${this.base}${qs}`);
  }

  create(body: CustomPriceRequest): Observable<CustomPrice> {
    return this.http.post<CustomPrice>(this.base, body);
  }

  update(id: string, body: CustomPriceRequest): Observable<CustomPrice> {
    return this.http.put<CustomPrice>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
