import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InterestCalculationResponse } from '../models/interest-calculation.model';
import { AccountsReceivable } from '../models/cxc.model';

@Injectable({ providedIn: 'root' })
export class InterestService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/accounts-receivable';

  calculateInterest(): Observable<InterestCalculationResponse> {
    return this.http.post<InterestCalculationResponse>(`${this.base}/calculate-interest`, {});
  }

  getArWithInterest(): Observable<AccountsReceivable[]> {
    return this.http.get<AccountsReceivable[]>(`${this.base}/intereses`);
  }
}
