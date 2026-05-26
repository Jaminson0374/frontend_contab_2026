import { Component, inject, viewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { ReportService } from '../../core/services/report.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import {
  Chart,
  BarController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { SalesByProduct, SalesByPeriod } from '../../core/models/report.model';

Chart.register(
  BarController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

@Component({
  selector: 'app-ventas-reportes',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  templateUrl: './ventas-reportes.html',
  styleUrl: './ventas-reportes.css',
})
export class VentasReportesComponent {
  private readonly reportService = inject(ReportService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly fromControl = new FormControl('');
  readonly toControl = new FormControl('');
  readonly warehouseControl = new FormControl('');
  readonly granularityControl = new FormControl('DAILY');

  readonly warehouses = this.warehouseService.warehouses;
  readonly dataProduct = this.reportService.salesByProduct;
  readonly dataPeriod = this.reportService.salesByPeriod;

  readonly columnsProduct = [
    'productName',
    'productGroup',
    'totalQuantity',
    'totalRevenue',
    'transactionCount',
  ];
  readonly columnsPeriod = ['period', 'totalInvoices', 'totalRevenue', 'totalNet', 'totalTax'];

  readonly productoChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('productoChart');
  readonly periodoChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('periodoChart');

  private productoChart: Chart | null = null;
  private periodoChart: Chart | null = null;

  constructor() {
    // Charts rendered on tab activation via afterNextRender guard
  }

  applyFilters(): void {
    const from = this.fromControl.value || '';
    const to = this.toControl.value || '';
    const wh = this.warehouseControl.value || '';
    const gran = this.granularityControl.value || 'DAILY';
    this.reportService.applyFilters(from, to, wh || undefined, gran);
  }

  renderProductChart(data: SalesByProduct[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.productoChart?.destroy();
    const canvas = this.productoChartCanvas()?.nativeElement;
    if (!canvas || !data.length) return;

    const top10 = data.slice(0, 10);
    this.productoChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top10.map((d) => d.productName),
        datasets: [
          {
            label: 'Ingresos ($)',
            data: top10.map((d) => d.totalRevenue),
            backgroundColor: '#3b82f6',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Top 10 Productos por Ingresos' } },
      },
    });
  }

  renderPeriodChart(data: SalesByPeriod[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.periodoChart?.destroy();
    const canvas = this.periodoChartCanvas()?.nativeElement;
    if (!canvas || !data.length) return;

    this.periodoChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((d) => d.period),
        datasets: [
          {
            label: 'Ingresos ($)',
            data: data.map((d) => d.totalRevenue),
            borderColor: '#3b82f6',
            tension: 0.2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Ingresos por Período' } },
      },
    });
  }

  onProductTabActivated(): void {
    const data = this.dataProduct.value();
    if (data) this.renderProductChart(data);
  }

  onPeriodTabActivated(): void {
    const data = this.dataPeriod.value();
    if (data) this.renderPeriodChart(data);
  }

  exportProductExcel(): void {
    const data = this.dataProduct.value();
    if (!data) return;
    this.reportService.exportToExcel(
      data.map((d) => ({
        Producto: d.productName,
        Grupo: d.productGroup ?? '',
        Cantidad: d.totalQuantity,
        Ingresos: d.totalRevenue,
        Transacciones: d.transactionCount,
      })),
      'ventas_producto',
      'Ventas por producto',
    );
  }

  exportPeriodExcel(): void {
    const data = this.dataPeriod.value();
    if (!data) return;
    this.reportService.exportToExcel(
      data.map((d) => ({
        Período: d.period,
        Facturas: d.totalInvoices,
        Ingresos: d.totalRevenue,
        Neto: d.totalNet,
        Impuestos: d.totalTax,
      })),
      'ventas_periodo',
      'Ventas por período',
    );
  }
}
