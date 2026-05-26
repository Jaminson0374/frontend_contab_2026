export type PurchaseOrderStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseLineItem {
  id?: string;
  productId: string;
  warehouseId: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  lineNumber: number;
}

export interface PurchaseLineItemResponse extends PurchaseLineItem {
  productName: string;
  warehouseName: string;
  remainingQty: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  documentNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  notes: string | null;
  lines: PurchaseLineItemResponse[];
  createdBy: string;
  createdAt: string;
}

export interface PurchaseOrderRequest {
  supplierId: string;
  orderDate: string;
  notes?: string | null;
  lines: Omit<PurchaseLineItem, 'id' | 'receivedQty'>[];
}
