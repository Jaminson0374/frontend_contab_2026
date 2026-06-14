export interface PurchaseReturnLineItem {
  productId: string;
  warehouseId: string;
  batchId: string;
  returnQty: number;
  unitCost: number;
  lineNumber: number;
}

export interface PurchaseReturnRequest {
  receiptId: string;
  reason: string;
  items: Omit<PurchaseReturnLineItem, 'lineNumber'>[];
}

export interface PurchaseReturnResponse {
  id: string;
  receiptId: string;
  returnDate: string;
  documentNumber: string;
  reason: string;
  status: string;
  lines: PurchaseReturnLineItem[];
  affectedBatches: number;
  totalReturned: number;
}
