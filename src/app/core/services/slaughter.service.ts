import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { SlaughterRequest, SlaughterResponse } from '../models/slaughter.model';

@Injectable({ providedIn: 'root' })
export class SlaughterService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/slaughters';

  process(request: SlaughterRequest): Observable<SlaughterResponse> {
    return this.http.post<SlaughterResponse>(`${this.base}`, request);
  }
}
