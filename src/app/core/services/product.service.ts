import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { PageResponse } from '../models/page.model';
import { Product, ProductRequest } from '../models/product.model';

type ProductSearchType = 'productCode' | 'name' | 'barcode';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/products';

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly query = signal('');

  private buildSearchParams(
    query: string,
    page: number,
    size: number,
    searchType?: ProductSearchType,
  ): string {
    const params = new URLSearchParams({
      page: `${page}`,
      size: `${size}`,
    });
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params.set('search', trimmedQuery);
      if (searchType) {
        params.set('searchType', searchType);
      }
    }

    return params.toString();
  }

  private requestPage(
    query: string,
    page: number,
    size: number,
    searchType?: ProductSearchType,
  ): Observable<PageResponse<Product>> {
    const params = this.buildSearchParams(query, page, size, searchType);
    return this.http.get<PageResponse<Product>>(`${this.base}?${params}`);
  }

  private emptyPage(page: number, size: number): PageResponse<Product> {
    return {
      content: [],
      page,
      size,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }

  private mergePages(
    pages: PageResponse<Product>[],
    page: number,
    size: number,
  ): PageResponse<Product> {
    const dedupedProducts = new Map<string, Product>();

    pages.forEach((response) => {
      response.content.forEach((product) => {
        if (!dedupedProducts.has(product.id)) {
          dedupedProducts.set(product.id, product);
        }
      });
    });

    const content = Array.from(dedupedProducts.values()).slice(0, size);
    const totalElements = content.length;
    const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);

    return {
      content,
      page,
      size,
      totalElements,
      totalPages,
      last: true,
    };
  }

  readonly products = httpResource<PageResponse<Product>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;

    const params = this.buildSearchParams(this.query(), this.page(), this.pageSize());

    return `${this.base}?${params}`;
  });

  search(query: string, page = 0, size = 10): Observable<PageResponse<Product>> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return this.requestPage('', page, size);
    }

    const searchRequests: Array<Observable<PageResponse<Product>>> = [
      this.requestPage(trimmedQuery, page, size, 'productCode'),
      this.requestPage(trimmedQuery, page, size, 'barcode'),
      this.requestPage(trimmedQuery, page, size, 'name'),
      this.requestPage(trimmedQuery, page, size),
    ].map((request) => request.pipe(catchError(() => of(this.emptyPage(page, size)))));

    return forkJoin(searchRequests).pipe(map((pages) => this.mergePages(pages, page, size)));
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/${id}`);
  }

  create(request: ProductRequest): Observable<Product> {
    return this.http.post<Product>(this.base, request);
  }

  update(id: string, request: ProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.base}/${id}`, request);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  readonly allProducts = httpResource<PageResponse<Product>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?size=20000`;
  });

  reload(): void {
    this.products.reload();
  }
}
