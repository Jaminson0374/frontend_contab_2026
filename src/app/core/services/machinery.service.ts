import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Machinery } from '../models/machinery.model';

@Injectable({ providedIn: 'root' })
export class MachineryService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/machinery';

  list(): Observable<Machinery[]> {
    return this.http.get<Machinery[]>(this.base);
  }
  getById(id: string): Observable<Machinery> {
    return this.http.get<Machinery>(`${this.base}/${id}`);
  }
  create(req: { code: string; name: string; machineryType: string }): Observable<Machinery> {
    return this.http.post<Machinery>(this.base, req);
  }
  update(
    id: string,
    req: { name: string; machineryType: string; status: string },
  ): Observable<Machinery> {
    return this.http.put<Machinery>(`${this.base}/${id}`, req);
  }
  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
