export type ProductionOrderStatus =
  | 'PLANNED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  formulaId: string;
  formulaName: string | null;
  plannedQuantity: number;
  plannedDate: string;
  status: ProductionOrderStatus;
  warehouseId: string;
  machineryId: string | null;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  batchId: string | null;
}

export interface ProductionOrderRequest {
  formulaId: string;
  plannedQuantity: number;
  plannedDate: string;
  warehouseId: string;
  machineryId?: string | null;
  notes?: string;
}

export interface ProductionOrderPage {
  content: ProductionOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
