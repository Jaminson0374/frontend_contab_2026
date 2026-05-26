import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { CustomerStatement } from '../models/statement.model';

@Injectable({ providedIn: 'root' })
export class StatementService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/customer-statements';

  generate(clientId: string, from: string, to: string): Observable<CustomerStatement> {
    return this.http.get<CustomerStatement>(`${this.base}/${clientId}?from=${from}&to=${to}`);
  }
}
