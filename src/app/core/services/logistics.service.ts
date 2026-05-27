import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  ReceiptRequest,
  ReceiptResponse,
  ReceiptPage,
  PickingRequest,
  PickingResponse,
  PickingPage,
  ShipmentRequest,
  ShipmentResponse,
  ShipmentPage,
  TransportGuideRequest,
  TransportGuideResponse,
  TransportGuidePage,
} from '../models/logistics.model';

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/logistics';

  // Receipts
  listReceipts(page = 0, size = 20): Observable<ReceiptPage> {
    return this.http.get<ReceiptPage>(`${this.base}/receipts?page=${page}&size=${size}`);
  }
  getReceipt(id: string): Observable<ReceiptResponse> {
    return this.http.get<ReceiptResponse>(`${this.base}/receipts/${id}`);
  }
  createReceipt(request: ReceiptRequest): Observable<ReceiptResponse> {
    return this.http.post<ReceiptResponse>(`${this.base}/receipts`, request);
  }
  updateReceiptStatus(id: string, status: string): Observable<ReceiptResponse> {
    return this.http.patch<ReceiptResponse>(
      `${this.base}/receipts/${id}/status?status=${status}`,
      {},
    );
  }

  // Pickings
  listPickings(page = 0, size = 20): Observable<PickingPage> {
    return this.http.get<PickingPage>(`${this.base}/pickings?page=${page}&size=${size}`);
  }
  getPicking(id: string): Observable<PickingResponse> {
    return this.http.get<PickingResponse>(`${this.base}/pickings/${id}`);
  }
  createPicking(request: PickingRequest): Observable<PickingResponse> {
    return this.http.post<PickingResponse>(`${this.base}/pickings`, request);
  }
  updatePickingStatus(id: string, status: string): Observable<PickingResponse> {
    return this.http.patch<PickingResponse>(
      `${this.base}/pickings/${id}/status?status=${status}`,
      {},
    );
  }

  // Shipments
  listShipments(page = 0, size = 20): Observable<ShipmentPage> {
    return this.http.get<ShipmentPage>(`${this.base}/shipments?page=${page}&size=${size}`);
  }
  getShipment(id: string): Observable<ShipmentResponse> {
    return this.http.get<ShipmentResponse>(`${this.base}/shipments/${id}`);
  }
  createShipment(request: ShipmentRequest): Observable<ShipmentResponse> {
    return this.http.post<ShipmentResponse>(`${this.base}/shipments`, request);
  }
  updateShipmentStatus(id: string, status: string): Observable<ShipmentResponse> {
    return this.http.patch<ShipmentResponse>(
      `${this.base}/shipments/${id}/status?status=${status}`,
      {},
    );
  }

  // Transport Guides
  listGuides(page = 0, size = 20): Observable<TransportGuidePage> {
    return this.http.get<TransportGuidePage>(
      `${this.base}/transport-guides?page=${page}&size=${size}`,
    );
  }
  getGuide(id: string): Observable<TransportGuideResponse> {
    return this.http.get<TransportGuideResponse>(`${this.base}/transport-guides/${id}`);
  }
  createGuide(request: TransportGuideRequest): Observable<TransportGuideResponse> {
    return this.http.post<TransportGuideResponse>(`${this.base}/transport-guides`, request);
  }
  updateGuideStatus(id: string, status: string): Observable<TransportGuideResponse> {
    return this.http.patch<TransportGuideResponse>(
      `${this.base}/transport-guides/${id}/status?status=${status}`,
      {},
    );
  }
}
