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

export interface ReceiptResponse {
  id: string;
  ocId: string;
  receiptDate: string;
  batchIds: string[];
  deviations: Array<{
    productId: string;
    ocUnitCost: number;
    actualCost: number;
    deviationPct: number;
  }>;
  createdAt: string;
}
