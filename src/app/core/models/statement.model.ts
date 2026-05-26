export interface StatementEntry {
  date: string;
  documentNumber: string;
  type: 'INVOICE' | 'RECEIPT';
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface CustomerStatement {
  clientId: string;
  clientName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  entries: StatementEntry[];
  closingBalance: number;
}
