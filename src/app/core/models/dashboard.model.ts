export interface DashboardSummary {
  todaySales: number;
  overdueReceivables: number;
  lowStockCount: number;
  currentMonthMargin: number;
  lastUpdated: string;
}

export interface KpiCard {
  icon: string;
  label: string;
  value: string;
  colorClass: string;
  trendIcon: string;
  trendColor: string;
}
