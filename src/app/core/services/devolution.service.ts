import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { DevolutionRequest, DevolutionResponse } from '../models/devolution.model';
import type { SalesDocument } from '../models/sale.model';

@Injectable({ providedIn: 'root' })
export class DevolutionService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/pos';

  submit(request: DevolutionRequest): Observable<DevolutionResponse> {
    return this.http.post<DevolutionResponse>(`${this.base}/devolutions`, request);
  }

  processDevolution(request: DevolutionRequest): Observable<DevolutionResponse> {
    return this.submit(request);
  }

  getByInvoice(invoiceId: string): Observable<SalesDocument[]> {
    return this.http.get<SalesDocument[]>(
      `${this.base}/devolutions?invoiceId=${encodeURIComponent(invoiceId)}`,
    );
  }
}
