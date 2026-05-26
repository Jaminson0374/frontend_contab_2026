export type AdjustmentType = 'PHYSICAL_COUNT' | 'DAMAGE' | 'EXPIRATION' | 'THEFT' | 'OTHER';

export interface StockAdjustment {
  id: string;
  productId: string;
  batchId: string | null;
  warehouseId: string;
  adjustmentType: AdjustmentType;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number;
  reason: string;
  createdBy: string | null;
  createdAt: string;
}

export interface AdjustmentRequest {
  productId: string;
  batchId?: string | null;
  warehouseId: string;
  adjustmentType: AdjustmentType;
  quantityAfter: number;
  reason: string;
}
