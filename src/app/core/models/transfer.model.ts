import type { PageResponse } from './page.model';

export type TransferStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface TransferItemRequest {
  productId: string;
  batchId?: string | null;
  quantity: number;
}

export interface TransferRequest {
  sourceWarehouseId: string;
  targetWarehouseId: string;
  notes?: string;
  items: TransferItemRequest[];
}

export interface TransferItemResponse {
  id: string;
  productId: string;
  batchId: string | null;
  quantity: number;
  unitCost: number;
}

export interface TransferResponse {
  id: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  status: TransferStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  items: TransferItemResponse[];
}

export type TransferPage = PageResponse<TransferResponse>;
