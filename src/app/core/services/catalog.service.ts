import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IdentificationType } from '../models/identification-type.model';
import { Department, City } from '../models/department.model';

export interface IdentificationTypeRequest {
  code: string;
  name: string;
  requiresDv: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http       = inject(HttpClient);

  readonly identificationTypes = httpResource<IdentificationType[]>(() =>
    isPlatformBrowser(this.platformId)
      ? '/api/v1/catalog/identification-types'
      : undefined
  );

  readonly departments = httpResource<Department[]>(() =>
    isPlatformBrowser(this.platformId)
      ? '/api/v1/catalog/departments'
      : undefined
  );

  readonly selectedDepartmentId = signal<string | null>(null);

  createIdentificationType(request: IdentificationTypeRequest): Observable<IdentificationType> {
    return this.http.post<IdentificationType>('/api/v1/catalog/identification-types', request);
  }

  reloadIdentificationTypes(): void {
    this.identificationTypes.reload();
  }

  readonly cities = httpResource<City[]>(() => {
    const deptId = this.selectedDepartmentId();
    if (!deptId || !isPlatformBrowser(this.platformId)) return undefined;
    return `/api/v1/catalog/departments/${deptId}/cities`;
  });
}
