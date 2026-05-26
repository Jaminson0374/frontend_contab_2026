export type NoteType = 'DEBIT_NOTE' | 'CREDIT_NOTE';

export interface DebitCreditNote {
  id: string;
  type: NoteType;
  supplierId: string;
  supplierName: string;
  supplierInvoiceId: string | null;
  documentNumber: string;
  amount: number;
  reason: string | null;
  reference: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DebitCreditNoteRequest {
  type: NoteType;
  supplierId: string;
  supplierInvoiceId?: string | null;
  documentNumber?: string | null;
  amount: number;
  reason?: string | null;
  reference?: string | null;
}
