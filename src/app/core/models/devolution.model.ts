export interface DevolutionItem {
  productId: string;
  quantity: number;
}

export interface DevolutionRequest {
  invoiceId: string;
  items: DevolutionItem[];
  reason: string;
}

export interface DevolutionItemResponse {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface DevolutionResponse {
  creditNoteId: string;
  documentNumber: string;
  items: DevolutionItemResponse[];
  totalReturned: number;
  stockReversed: boolean;
}
