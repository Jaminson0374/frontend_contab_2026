import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DevolutionRequest, DevolutionResponse } from '../models/devolution.model';

@Injectable({ providedIn: 'root' })
export class DevolutionService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/pos';

  processDevolution(request: DevolutionRequest): Observable<DevolutionResponse> {
    return this.http.post<DevolutionResponse>(`${this.base}/devolutions`, request);
  }
}
