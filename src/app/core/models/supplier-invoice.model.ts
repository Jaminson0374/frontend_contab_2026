export type InvoiceStatus = 'PENDING' | 'RECONCILED' | 'PAID' | 'DISPUTED';

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  ivaTotal: number;
  retentionTotal: number;
  total: number;
  status: InvoiceStatus;
  ocIds: string[];
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface SupplierInvoiceRequest {
  supplierId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  ivaTotal: number;
  retentionTotal: number;
  total: number;
  ocIds?: string[];
  notes?: string | null;
}

export interface SupplierBalance {
  supplierId: string;
  currentBalance: number;
}
