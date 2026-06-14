import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  PurchaseReportResponse,
  SupplierPurchaseResponse,
  ProductPurchaseResponse,
  PurchaseSalesComparisonResponse,
} from '../models/purchase-report.model';

@Injectable({ providedIn: 'root' })
export class PurchaseReportService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/purchase-reports';

  getSummary(startDate: string, endDate: string): Observable<PurchaseReportResponse> {
    return this.http.get<PurchaseReportResponse>(
      `${this.base}/summary?startDate=${startDate}&endDate=${endDate}`,
    );
  }

  getBySupplier(startDate: string, endDate: string): Observable<SupplierPurchaseResponse[]> {
    return this.http.get<SupplierPurchaseResponse[]>(
      `${this.base}/by-supplier?startDate=${startDate}&endDate=${endDate}`,
    );
  }

  getByProduct(startDate: string, endDate: string): Observable<ProductPurchaseResponse[]> {
    return this.http.get<ProductPurchaseResponse[]>(
      `${this.base}/by-product?startDate=${startDate}&endDate=${endDate}`,
    );
  }

  getComparison(year: number, month: number): Observable<PurchaseSalesComparisonResponse> {
    return this.http.get<PurchaseSalesComparisonResponse>(
      `${this.base}/comparison?year=${year}&month=${month}`,
    );
  }
}
