import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { PurchaseReportService } from '../../../core/services/purchase-report.service';
import type {
  PurchaseReportResponse,
  SupplierPurchaseResponse,
  ProductPurchaseResponse,
  PurchaseSalesComparisonResponse,
} from '../../../core/models/purchase-report.model';

@Component({
  selector: 'app-compras-reportes',
  imports: [
    ReactiveFormsModule,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compras-reportes.html',
  styleUrl: './compras-reportes.css',
})
export class ComprasReportesComponent implements OnInit {
  private readonly reportService = inject(PurchaseReportService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly summary = signal<PurchaseReportResponse | null>(null);
  readonly suppliers = signal<SupplierPurchaseResponse[]>([]);
  readonly products = signal<ProductPurchaseResponse[]>([]);
  readonly comparison = signal<PurchaseSalesComparisonResponse | null>(null);

  readonly startDate = new FormControl<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    { nonNullable: true },
  );
  readonly endDate = new FormControl<Date>(new Date(), { nonNullable: true });
  readonly comparisonMonth = new FormControl<Date>(new Date(), { nonNullable: true });

  readonly summaryColumns = ['month', 'total', 'orderCount', 'receiptCount'];
  readonly supplierColumns = ['supplierName', 'totalPurchased', 'orderCount', 'avgOrderValue'];
  readonly productColumns = ['productName', 'productCode', 'totalQty', 'totalCost', 'avgUnitCost'];

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    const from = this.formatDateParam(this.startDate.value);
    const to = this.formatDateParam(this.endDate.value);

    this.reportService.getSummary(from, to).subscribe({
      next: (data) => this.summary.set(data),
      error: (err) => this.error.set(err?.error?.message ?? 'Error al cargar resumen'),
    });

    this.reportService.getBySupplier(from, to).subscribe({
      next: (data) => this.suppliers.set(data),
      error: (err) => this.error.set(err?.error?.message ?? 'Error al cargar proveedores'),
    });

    this.reportService.getByProduct(from, to).subscribe({
      next: (data) => this.products.set(data),
      error: (err) => this.error.set(err?.error?.message ?? 'Error al cargar productos'),
    });

    const compMonth = this.comparisonMonth.value;
    const year = compMonth.getFullYear();
    const month = compMonth.getMonth() + 1;

    this.reportService.getComparison(year, month).subscribe({
      next: (data) => {
        this.comparison.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al cargar comparativa');
        this.loading.set(false);
      },
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatPercent(value: number): string {
    return value.toFixed(1) + '%';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatDateParam(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
