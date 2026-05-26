export interface Advance {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  remainingAdvance: number;
  method: string;
  reference: string | null;
  createdAt: string;
}

export interface AdvanceRequest {
  supplierId: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string | null;
  notes?: string | null;
}

export interface ApplyAdvanceRequest {
  advancePaymentId: string;
  invoiceId: string;
  appliedAmount: number;
}
