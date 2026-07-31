export type BatchStatus = 'OPEN' | 'PROCESSING' | 'CLOSED';

export type BatchType = 'STANDARD' | 'PARENT' | 'CHILD';

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
  parentBatchId?: string | null;
  batchType?: BatchType;
  unitOfMeasureId?: string | null;
  unitOfMeasureName?: string;
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
  expirationDate?: string | null;
  batchType?: string;
  unitOfMeasureId?: string | null;
}
