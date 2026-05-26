export type BatchStatus = 'OPEN' | 'PROCESSING' | 'CLOSED';

export interface Batch {
  id: string;
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
  createdBy: string;
  createdAt: string;
}

export interface BatchRequest {
  supplierId: string;
  warehouseId: string;
  entryDate: string;
  initialWeight: number;
  purchaseCost: number;
  notes: string | null;
}
