import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProduceRequest, ProduceResponse } from '../models/product-formula.model';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/production/batches';

  produce(request: ProduceRequest): Observable<ProduceResponse> {
    return this.http.post<ProduceResponse>(this.base, request);
  }

  listBatches(formulaId: string): Observable<ProduceResponse[]> {
    return this.http.get<ProduceResponse[]>(`${this.base}?formulaId=${formulaId}`);
  }
}
