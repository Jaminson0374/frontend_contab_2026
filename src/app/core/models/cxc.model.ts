export const AR_STATUS = {
  OPEN: 'OPEN',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type ArStatus = (typeof AR_STATUS)[keyof typeof AR_STATUS];

export interface AccountsReceivable {
  id: string;
  clientId: string;
  clientName: string | null;
  documentId: string;
  documentNumber: string | null;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  dueDate: string;
  status: ArStatus;
  createdAt: string;
  updatedAt: string;
  interestRate: number | null;
  interestAmount: number;
  lastInterestCalcDate: string | null;
}

export interface AgingBucket {
  count: number;
  total: number;
}

export interface ArAgingResponse {
  current: AgingBucket;
  days1to30: AgingBucket;
  days31to60: AgingBucket;
  days61to90: AgingBucket;
  days91Plus: AgingBucket;
  totalOutstanding: number;
}
