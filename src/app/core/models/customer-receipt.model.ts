export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'CHECK';

export interface ReceiptApplication {
  arId: string;
  appliedAmount: number;
}

export interface CustomerReceiptRequest {
  clientId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  applications: ReceiptApplication[];
}

export interface ReceiptApplicationResponse {
  id: string;
  receiptId: string;
  arId: string;
  appliedAmount: number;
}

export interface CustomerReceipt {
  id: string;
  clientId: string;
  clientName: string | null;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  applications: ReceiptApplicationResponse[];
}
