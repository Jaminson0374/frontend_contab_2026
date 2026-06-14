import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import {
  ThirdParty,
  ThirdPartyRequest,
  ThirdPartySupplierOption,
} from '../models/third-party.model';

@Injectable({ providedIn: 'root' })
export class ThirdPartyService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/third-parties';

  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly query = signal('');
  readonly typeFilter = signal('');

  readonly thirdParties = httpResource<PageResponse<ThirdParty>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const params = new URLSearchParams({
      page: `${this.page()}`,
      size: `${this.pageSize()}`,
    });
    const q = this.query();
    if (q) params.set('q', q);
    const t = this.typeFilter();
    if (t) params.set('type', t);
    return `${this.base}?${params.toString()}`;
  });

  readonly supplierOptions = httpResource<ThirdPartySupplierOption[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}/suppliers`;
  });

  getById(id: string): Observable<ThirdParty> {
    return this.http.get<ThirdParty>(`${this.base}/${id}`);
  }

  create(request: ThirdPartyRequest): Observable<ThirdParty> {
    return this.http.post<ThirdParty>(this.base, request);
  }

  update(id: string, request: ThirdPartyRequest): Observable<ThirdParty> {
    return this.http.put<ThirdParty>(`${this.base}/${id}`, request);
  }

  getEmployees(): Observable<ThirdParty[]> {
    return this.http
      .get<PageResponse<ThirdParty>>(`${this.base}?type=EMPLOYEE&active=true&size=100`)
      .pipe(map((p) => p.content));
  }

  reload(): void {
    this.thirdParties.reload();
    this.supplierOptions.reload();
  }
}
