import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ThirdPartyCategory, ThirdPartyCategoryRequest } from '../models/third-party-category.model';

@Injectable({ providedIn: 'root' })
export class ThirdPartyCategoryService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = '/api/v1/third-party-categories';

  readonly categories = httpResource<ThirdPartyCategory[]>(() =>
    isPlatformBrowser(this.platformId) ? this.base : undefined
  );

  create(request: ThirdPartyCategoryRequest): Observable<ThirdPartyCategory> {
    return this.http.post<ThirdPartyCategory>(this.base, request);
  }

  reload(): void {
    this.categories.reload();
  }
}
