import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CashRegister } from '../models/cash-register.model';

@Injectable({ providedIn: 'root' })
export class CashRegisterService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/cash-registers';

  listActive(): Observable<CashRegister[]> {
    return this.http.get<CashRegister[]>(this.base);
  }
}
