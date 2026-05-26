import type { PageResponse } from './page.model';

export const SHIFT_STATUS = { OPEN: 'OPEN', CLOSED: 'CLOSED' } as const;
export type ShiftStatus = (typeof SHIFT_STATUS)[keyof typeof SHIFT_STATUS];

export interface Shift {
  id: string;
  cashRegisterId: string;
  cashRegisterName?: string;
  userId: string;
  userName?: string;
  openingTime: string;
  closingTime: string | null;
  openingAmount: number;
  closingAmount: number | null;
  status: ShiftStatus;
  zReportUrl: string | null;
  createdAt: string;
}

export interface ShiftRequest {
  cashRegisterId: string;
  openingAmount?: number;
}

export interface CashCountRequest {
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalCredit: number;
  notes?: string;
}

export interface CashCountResponse {
  expectedTotal: number;
  actualTotal: number;
  difference: number;
  invoiceCount: number;
}

export type { PageResponse };
