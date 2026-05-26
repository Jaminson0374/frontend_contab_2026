import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { ManualDesposteRequest, ManualDesposteResult } from '../models/desposte.model';

@Injectable({ providedIn: 'root' })
export class DesposteService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/despostes';

  processManual(request: ManualDesposteRequest): Observable<ManualDesposteResult> {
    return this.http.post<ManualDesposteResult>(`${this.base}/manual`, request);
  }
}
