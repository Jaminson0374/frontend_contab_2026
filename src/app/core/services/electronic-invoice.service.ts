import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ElectronicInvoice, ElectronicInvoiceStatus } from '../models/dian.model';

@Injectable({ providedIn: 'root' })
export class ElectronicInvoiceService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/admin/electronic-invoices';

  getBySalesDocument(salesDocId: string): Observable<ElectronicInvoice> {
    return this.http.get<ElectronicInvoice>(`${this.base}/by-document/${salesDocId}`);
  }

  retry(id: string): Observable<string> {
    return this.http.post<string>(`${this.base}/${id}/retry`, {});
  }

  list(filters?: {
    status?: ElectronicInvoiceStatus;
    page?: number;
    size?: number;
  }): Observable<ElectronicInvoice[]> {
    let url = `${this.base}?page=${filters?.page ?? 0}&size=${filters?.size ?? 20}`;
    if (filters?.status) {
      url += `&status=${filters.status}`;
    }
    return this.http.get<ElectronicInvoice[]>(url);
  }

  getById(id: string): Observable<ElectronicInvoice> {
    return this.http.get<ElectronicInvoice>(`${this.base}/${id}`);
  }
}
