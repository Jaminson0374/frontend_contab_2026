import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import type { Animal, AnimalRequest, AnimalStatus } from '../models/animal.model';

@Injectable({ providedIn: 'root' })
export class AnimalService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/animals';

  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly query = signal('');
  readonly status = signal<AnimalStatus | null>(null);

  private buildSearchParams(): string {
    const params = new URLSearchParams({
      page: `${this.page()}`,
      size: `${this.pageSize()}`,
    });
    const status = this.status();
    if (status) {
      params.set('status', status);
    }
    const query = this.query().trim();
    if (query) {
      params.set('search', query);
    }
    return params.toString();
  }

  private buildParams(page: number, size: number, status?: AnimalStatus | null): string {
    const params = new URLSearchParams({
      page: `${page}`,
      size: `${size}`,
    });

    if (status) {
      params.set('status', status);
    }

    return params.toString();
  }

  private requestPage(
    page: number,
    size: number,
    status?: AnimalStatus | null,
  ): Observable<PageResponse<Animal>> {
    return this.http.get<PageResponse<Animal>>(
      `${this.base}?${this.buildParams(page, size, status)}`,
    );
  }

  private emptyPage(page: number, size: number): PageResponse<Animal> {
    return {
      content: [],
      page,
      size,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }

  readonly animales = httpResource<PageResponse<Animal>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildSearchParams()}`;
  });

  search(query: string, page = 0, size = 10): Observable<PageResponse<Animal>> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return this.requestPage(page, size, this.status());
    }
    return this.http.get<PageResponse<Animal>>(
      `${this.base}?search=${encodeURIComponent(trimmedQuery)}&page=${page}&size=${size}`,
    );
  }

  create(request: AnimalRequest): Observable<Animal> {
    return this.http.post<Animal>(this.base, request);
  }

  update(id: string, request: AnimalRequest): Observable<Animal> {
    return this.http.patch<Animal>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  reload(): void {
    this.animales.reload();
  }
}

/** Exported for testing. Mirrors AnimalService.buildSearchParams logic. */
export function buildSearchParams(cfg: {
  page: number;
  pageSize: number;
  query: string;
  status: string | null;
}): string {
  const params = new URLSearchParams({
    page: `${cfg.page}`,
    size: `${cfg.pageSize}`,
  });
  if (cfg.status) {
    params.set('status', cfg.status);
  }
  const q = cfg.query.trim();
  if (q) {
    params.set('search', q);
  }
  return params.toString();
}
