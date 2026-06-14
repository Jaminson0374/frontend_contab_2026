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
  dueDate?: string;
  supplierAddress?: string;
  buyerId?: string;
  buyerName?: string;
  paymentMethod?: string;
  supportDocumentType?: string;
  supportDocumentNumber?: string;
  currency?: string;
  notes: string | null;
  lines: PurchaseLineItemResponse[];
  createdBy: string;
  createdAt: string;
}

export interface PurchaseOrderRequest {
  supplierId: string;
  orderDate: string;
  dueDate?: string | null;
  buyerId?: string | null;
  paymentMethod?: string | null;
  supportDocumentType?: string | null;
  supportDocumentNumber?: string | null;
  currency?: string | null;
  notes?: string | null;
  lines: Omit<PurchaseLineItem, 'id' | 'receivedQty'>[];
}
