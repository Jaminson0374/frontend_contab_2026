export interface PurchaseReportResponse {
  monthlySummaries: MonthlyPurchaseSummary[];
  totalPurchased: number;
  totalOrders: number;
  totalReceipts: number;
}

export interface MonthlyPurchaseSummary {
  month: string;
  total: number;
  orderCount: number;
  receiptCount: number;
}

export interface SupplierPurchaseResponse {
  supplierId: string;
  supplierName: string;
  totalPurchased: number;
  orderCount: number;
  avgOrderValue: number;
}

export interface ProductPurchaseResponse {
  productId: string;
  productName: string;
  productCode: string;
  totalQty: number;
  totalCost: number;
  avgUnitCost: number;
}

export interface PurchaseSalesComparisonResponse {
  year: number;
  month: number;
  totalPurchases: number;
  totalSales: number;
  margin: number;
  marginPct: number;
}
