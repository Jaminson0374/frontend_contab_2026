export interface SalesByProduct {
  productId: string;
  productName: string;
  productCode: string;
  productGroup: string | null;
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
}

export interface SalesByPeriod {
  period: string;
  totalInvoices: number;
  totalRevenue: number;
  totalNet: number;
  totalTax: number;
}

export interface ProfitabilityRow {
  productId: string;
  productName: string;
  productCode: string;
  totalRevenue: number;
  totalCogs: number;
  grossMargin: number;
  marginPercent: number;
}

export interface RevenueItem {
  label: string;
  amount: number;
}

export interface IncomeStatement {
  totalRevenue: number;
  totalCogs: number;
  grossMargin: number;
  totalExpenses: number;
  netIncome: number;
  revenueDetails: RevenueItem[];
  cogsDetails: RevenueItem[];
  expenseDetails: RevenueItem[];
}

export interface ReportFilters {
  from: string;
  to: string;
  warehouseId?: string;
  granularity?: string;
}
