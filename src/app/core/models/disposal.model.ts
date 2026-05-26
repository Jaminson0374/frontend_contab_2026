export type DisposalType = 'SANITARIO' | 'RESIDUO_VENDIBLE' | 'MERMA_PROCESO';

export interface DisposalRequest {
  productId: string;
  batchId?: string | null;
  warehouseId: string;
  disposalType: DisposalType;
  quantity: number;
  reason: string;
}

export interface DisposalResponse {
  id: string;
  productId: string;
  batchId: string | null;
  warehouseId: string;
  disposalType: DisposalType;
  quantity: number;
  unitCost: number;
  reason: string;
  createdBy: string | null;
  createdAt: string;
}
