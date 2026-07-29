export interface ReceiptLineItemInput {
  productId: string;
  warehouseId: string;
  receivedQty: number;
  actualCost: number;
  expirationDate?: string | null;
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
  expirationDates: (string | null)[];
  deviations: Deviation[];
}

export type ReceiptResponse = GoodsReceipt;
