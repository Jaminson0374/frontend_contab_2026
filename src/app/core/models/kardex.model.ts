export type MovementType =
  | 'ENTRY'
  | 'EXIT'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DISPOSAL'
  | 'RETURN'
  | 'PRODUCTION_CONSUMPTION'
  | 'PRODUCTION_OUTPUT'
  | 'PRODUCTION_SHRINKAGE';

export interface InventoryMovement {
  id: string;
  productId: string;
  batchId: string | null;
  warehouseId: string;
  movementType: MovementType;
  quantity: number;
  unitCost: number;
  previousQty: number;
  newQty: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface KardexQuery {
  productId?: string;
  batchId?: string;
  warehouseId?: string;
  movementType?: MovementType;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
