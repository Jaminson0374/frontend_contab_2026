export type ApStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface AccountsPayable {
  id: string;
  supplierId: string;
  supplierName: string;
  documentId: string | null;
  debitCreditNoteId: string | null;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  dueDate: string;
  status: ApStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApAgingBucket {
  label: string;
  count: number;
  totalOutstanding: number;
}

export interface ApAgingResponse {
  buckets: ApAgingBucket[];
  overallTotal: number;
}

export const AP_STATUS_LABELS: Record<ApStatus, string> = {
  OPEN: 'Abierto',
  PARTIAL: 'Parcial',
  PAID: 'Pagado',
  OVERDUE: 'Vencido',
};
