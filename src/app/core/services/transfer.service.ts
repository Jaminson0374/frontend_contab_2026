import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { TransferRequest, TransferResponse, TransferPage } from '../models/transfer.model';

@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/transfers';

  list(page = 0, size = 20): Observable<TransferPage> {
    return this.http.get<TransferPage>(`${this.base}?page=${page}&size=${size}`);
  }

  create(request: TransferRequest): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(this.base, request);
  }

  confirm(id: string): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(`${this.base}/${id}/confirm`, {});
  }

  cancel(id: string): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(`${this.base}/${id}/cancel`, {});
  }

  getById(id: string): Observable<TransferResponse> {
    return this.http.get<TransferResponse>(`${this.base}/${id}`);
  }
}
