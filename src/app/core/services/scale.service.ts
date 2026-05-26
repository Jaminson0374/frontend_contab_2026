import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScaleReading } from '../models/scale.model';

@Injectable({ providedIn: 'root' })
export class ScaleService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/scale';

  getReading(): Observable<ScaleReading> {
    return this.http.get<ScaleReading>(`${this.base}/status`);
  }
}
