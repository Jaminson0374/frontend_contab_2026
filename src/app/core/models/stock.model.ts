export interface InventoryStock {
  id: string;
  productId: string;
  batchId: string;
  warehouseId: string;
  currentQuantity: number;
  committedQuantity: number;
  availableQuantity: number;
  unitCost: number;
  updatedAt: string;
  productName?: string;
  productCode?: string;
  batchType?: string;
}
