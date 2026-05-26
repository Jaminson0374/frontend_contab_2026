import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { untracked } from '@angular/core';
import * as XLSX from 'xlsx';
import type {
  SalesByProduct,
  SalesByPeriod,
  ProfitabilityRow,
  IncomeStatement,
} from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/reports';

  readonly from = signal('');
  readonly to = signal('');
  readonly warehouseId = signal('');
  readonly granularity = signal('DAILY');

  readonly salesByProduct = httpResource<SalesByProduct[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const f = untracked(this.from);
    const t = untracked(this.to);
    const w = untracked(this.warehouseId);
    if (!f || !t) return undefined;
    const params = new URLSearchParams({ from: f, to: t });
    if (w) params.set('warehouseId', w);
    return `${this.base}/sales-by-product?${params.toString()}`;
  });

  readonly salesByPeriod = httpResource<SalesByPeriod[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const f = untracked(this.from);
    const t = untracked(this.to);
    const g = untracked(this.granularity);
    if (!f || !t) return undefined;
    const params = new URLSearchParams({ from: f, to: t, granularity: g });
    return `${this.base}/sales-by-period?${params.toString()}`;
  });

  readonly profitability = httpResource<ProfitabilityRow[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const f = untracked(this.from);
    const t = untracked(this.to);
    const w = untracked(this.warehouseId);
    if (!f || !t) return undefined;
    const params = new URLSearchParams({ from: f, to: t });
    if (w) params.set('warehouseId', w);
    return `${this.base}/profitability?${params.toString()}`;
  });

  readonly incomeStatement = httpResource<IncomeStatement>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const f = untracked(this.from);
    const t = untracked(this.to);
    if (!f || !t) return undefined;
    const params = new URLSearchParams({ from: f, to: t });
    return `${this.base}/income-statement?${params.toString()}`;
  });

  exportToExcel(data: Record<string, unknown>[], filename: string, sheetName: string): void {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
  }

  applyFilters(from: string, to: string, warehouseId?: string, granularity?: string): void {
    this.from.set(from);
    this.to.set(to);
    if (warehouseId !== undefined) this.warehouseId.set(warehouseId);
    if (granularity !== undefined) this.granularity.set(granularity);
  }
}
