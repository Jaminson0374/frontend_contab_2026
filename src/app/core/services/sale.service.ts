import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import {
  SalesDocument,
  SalesDocumentRequest,
  SaleItemRequest,
  SalesDocumentStatus,
  TransitionRequest,
} from '../models/sale.model';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/sales';

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly query = signal('');
  readonly typeFilter = signal<string>('');
  readonly statusFilter = signal<string>('');

  private buildSearchParams(
    query: string,
    page: number,
    size: number,
    type?: string,
    status?: string,
  ): string {
    const params = new URLSearchParams({
      page: `${page}`,
      size: `${size}`,
    });
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params.set('search', trimmedQuery);
    }
    if (type) {
      params.set('type', type);
    }
    if (status) {
      params.set('status', status);
    }

    return params.toString();
  }

  readonly documents = httpResource<PageResponse<SalesDocument>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;

    const params = this.buildSearchParams(
      this.query(),
      this.page(),
      this.pageSize(),
      this.typeFilter() || undefined,
      this.statusFilter() || undefined,
    );

    return `${this.base}/documents?${params}`;
  });

  search(
    query: string,
    page = 0,
    size = 20,
    type?: string,
    status?: string,
  ): Observable<PageResponse<SalesDocument>> {
    const params = this.buildSearchParams(query, page, size, type, status);
    return this.http.get<PageResponse<SalesDocument>>(`${this.base}/documents?${params}`);
  }

  createDocument(request: SalesDocumentRequest): Observable<SalesDocument> {
    return this.http.post<SalesDocument>(`${this.base}/documents`, request);
  }

  transitionDocument(id: string, targetStatus: SalesDocumentStatus): Observable<SalesDocument> {
    const body: TransitionRequest = { targetStatus };
    return this.http.post<SalesDocument>(`${this.base}/documents/${id}/transition`, body);
  }

  getDocument(id: string): Observable<SalesDocument> {
    return this.http.get<SalesDocument>(`${this.base}/documents/${id}`);
  }

  addItem(documentId: string, item: SaleItemRequest): Observable<SalesDocument> {
    return this.http.post<SalesDocument>(`${this.base}/documents/${documentId}/items`, item);
  }

  updateItem(itemId: string, item: SaleItemRequest): Observable<SalesDocument> {
    return this.http.put<SalesDocument>(`${this.base}/items/${itemId}`, item);
  }

  removeItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/items/${itemId}`);
  }

  reload(): void {
    this.documents.reload();
  }
}
