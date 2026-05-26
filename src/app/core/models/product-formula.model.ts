export interface ProductFormula {
  id: string;
  parentProductId: string;
  componentProductId: string;
  quantity: number;
  unitOfMeasureId: string | null;
  sequenceNumber: number;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormulaComponent {
  componentId: string;
  componentName: string;
  requiredQuantity: number;
  unitOfMeasure: string;
  currentStock: number;
  estimatedCost: number;
}

export interface ProduceRequest {
  formulaProductId: string;
  warehouseId: string;
  quantity: number;
  laborCost: number;
  overheadCost: number | null;
  notes: string | null;
}

export interface ProduceResponse {
  batchId: string;
  productName: string;
  quantityProduced: number;
  mpd: number;
  mod: number;
  cif: number;
  totalCost: number;
  unitCost: number;
  shrinkage: number;
  items: BatchItemResponse[];
}

export interface BatchItemResponse {
  componentId: string;
  componentName: string;
  plannedQuantity: number;
  actualQuantity: number;
  unitCost: number;
  totalCost: number;
  kardexMovementId: string | null;
}

export interface ProductionBatch {
  id: string;
  formulaId: string;
  quantityProduced: number;
  expectedQuantity: number;
  directMaterialCost: number;
  directLaborCost: number;
  overheadCost: number;
  totalCost: number;
  unitCost: number;
  shrinkageQuantity: number;
  shrinkageCost: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}
