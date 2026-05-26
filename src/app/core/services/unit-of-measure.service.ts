import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UnitOfMeasure } from '../models/product-catalog.model';

@Injectable({ providedIn: 'root' })
export class UnitOfMeasureService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = '/api/v1/units-of-measure';

  readonly units = httpResource<UnitOfMeasure[]>(() =>
    isPlatformBrowser(this.platformId) ? this.base : undefined
  );

  create(code: string, name: string, baseUnit?: string): Observable<UnitOfMeasure> {
    return this.http.post<UnitOfMeasure>(this.base, { code, name, baseUnit: baseUnit ?? null });
  }

  reload(): void { this.units.reload(); }
}
