export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA';

export interface AppliedAmount {
  invoiceId: string;
  appliedAmount: number;
}

export interface Payment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  invoiceIds: string[];
  appliedAmounts: AppliedAmount[];
  createdBy: string;
  createdAt: string;
}

export interface PaymentRequest {
  supplierId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string | null;
  invoiceIds: string[];
  appliedAmounts: AppliedAmount[];
}
