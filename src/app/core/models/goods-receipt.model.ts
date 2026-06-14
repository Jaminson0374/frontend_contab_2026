export interface ReceiptLineItemInput {
  productId: string;
  warehouseId: string;
  receivedQty: number;
  actualCost: number;
}

export interface GoodsReceiptRequest {
  ocId: string;
  lines: ReceiptLineItemInput[];
}

export interface Deviation {
  productId: string;
  ocUnitCost: number;
  actualCost: number;
  deviationPct: number;
}

export interface GoodsReceipt {
  id: string;
  ocId: string;
  receiptDate: string;
  batchIds: string[];
  deviations: Deviation[];
}

export type ReceiptResponse = GoodsReceipt;
