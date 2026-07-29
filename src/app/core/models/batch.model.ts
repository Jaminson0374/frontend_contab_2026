export type BatchStatus = 'OPEN' | 'PROCESSING' | 'CLOSED';

export interface Batch {
  id: string;
  productId: string;
  supplierId: string;
  warehouseId: string;
  entryDate: string;
  initialWeight: number;
  purchaseCost: number;
  status: BatchStatus;
  notes: string | null;
  expirationDate?: string | null;
  sourceReceiptId?: string;
  ocId?: string;
  productName: string;
  supplierName: string;
  warehouseName: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

export interface BatchRequest {
  supplierId: string;
  warehouseId: string;
  productId: string;
  entryDate: string;
  initialWeight: number;
  purchaseCost: number;
  notes: string | null;
  sourceReceiptId?: string | null;
  ocId?: string | null;
}
