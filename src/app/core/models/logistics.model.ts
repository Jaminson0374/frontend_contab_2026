import type { PageResponse } from './page.model';

export type ReceiptStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
export type PickingStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ShipmentStatus = 'DRAFT' | 'CONFIRMED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type TransportGuideStatus = 'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'CLOSED';

export interface ReceiptItemRequest {
  id?: string;
  productId: string;
  warehouseId: string;
  batchId?: string;
  orderedQuantity?: number;
  receivedQuantity: number;
  unitCost: number;
  notes?: string;
}

export interface ReceiptRequest {
  receiptNumber: string;
  receiptDate: string;
  supplierId?: string;
  purchaseOrderId?: string;
  warehouseId: string;
  notes?: string;
  items: ReceiptItemRequest[];
}

export interface ReceiptItemResponse {
  id: string;
  receiptId: string;
  productId: string;
  warehouseId: string;
  batchId?: string;
  orderedQuantity?: number;
  receivedQuantity: number;
  unitCost: number;
  notes?: string;
}

export interface ReceiptResponse {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  supplierId?: string;
  purchaseOrderId?: string;
  warehouseId: string;
  status: ReceiptStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: ReceiptItemResponse[];
}

export interface PickingItemRequest {
  id?: string;
  productId: string;
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  requestedQuantity: number;
  pickedQuantity?: number;
  notes?: string;
}

export interface PickingRequest {
  pickingNumber: string;
  pickingDate: string;
  warehouseId: string;
  shipmentId?: string;
  salesOrderId?: string;
  notes?: string;
  items: PickingItemRequest[];
}

export interface PickingItemResponse {
  id: string;
  pickingId: string;
  productId: string;
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  requestedQuantity: number;
  pickedQuantity: number;
  notes?: string;
}

export interface PickingResponse {
  id: string;
  pickingNumber: string;
  pickingDate: string;
  warehouseId: string;
  shipmentId?: string;
  salesOrderId?: string;
  status: PickingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: PickingItemResponse[];
}

export interface ShipmentItemRequest {
  id?: string;
  productId: string;
  pickingId?: string;
  batchId?: string;
  quantity: number;
  notes?: string;
}

export interface ShipmentRequest {
  shipmentNumber: string;
  shipmentDate: string;
  carrierName?: string;
  vehiclePlate?: string;
  driverName?: string;
  transportGuideId?: string;
  notes?: string;
  items: ShipmentItemRequest[];
}

export interface ShipmentItemResponse {
  id: string;
  shipmentId: string;
  productId: string;
  pickingId?: string;
  batchId?: string;
  quantity: number;
  notes?: string;
}

export interface ShipmentResponse {
  id: string;
  shipmentNumber: string;
  shipmentDate: string;
  carrierName?: string;
  vehiclePlate?: string;
  driverName?: string;
  transportGuideId?: string;
  status: ShipmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: ShipmentItemResponse[];
}

export interface TransportGuideRequest {
  guideNumber: string;
  issueDate: string;
  vehiclePlate?: string;
  driverName?: string;
  driverId?: string;
  originAddress?: string;
  destinationAddress?: string;
  carrierName?: string;
  estimatedDelivery?: string;
  notes?: string;
  shipmentIds?: string[];
}

export interface TransportGuideResponse {
  id: string;
  guideNumber: string;
  issueDate: string;
  vehiclePlate?: string;
  driverName?: string;
  driverId?: string;
  originAddress?: string;
  destinationAddress?: string;
  carrierName?: string;
  estimatedDelivery?: string;
  status: TransportGuideStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  shipmentIds: string[];
}

export type ReceiptPage = PageResponse<ReceiptResponse>;
export type PickingPage = PageResponse<PickingResponse>;
export type ShipmentPage = PageResponse<ShipmentResponse>;
export type TransportGuidePage = PageResponse<TransportGuideResponse>;
