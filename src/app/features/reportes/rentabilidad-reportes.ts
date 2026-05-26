import { Component, inject, viewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CurrencyPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ProfitabilityRow } from '../../core/models/report.model';

Chart.register(BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

@Component({
  selector: 'app-rentabilidad-reportes',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
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
  templateUrl: './rentabilidad-reportes.html',
  styleUrl: './rentabilidad-reportes.css',
})
export class RentabilidadReportesComponent {
  private readonly reportService = inject(ReportService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly fromControl = new FormControl('');
  readonly toControl = new FormControl('');
  readonly warehouseControl = new FormControl('');

  readonly warehouses = this.warehouseService.warehouses;
  readonly data = this.reportService.profitability;

  readonly columns = [
    'productName',
    'productCode',
    'totalRevenue',
    'totalCogs',
    'grossMargin',
    'marginPercent',
  ];

  readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('profitChart');
  private chart: Chart | null = null;

  applyFilters(): void {
    const from = this.fromControl.value || '';
    const to = this.toControl.value || '';
    const wh = this.warehouseControl.value || '';
    this.reportService.applyFilters(from, to, wh || undefined);
    this.renderChart();
  }

  private renderChart(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const items = this.data.value();
    if (!items?.length) return;
    const top10 = items.slice(0, 10);

    this.chart?.destroy();
    const canvas = this.chartCanvas()?.nativeElement;
    if (!canvas) return;

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top10.map((d) => d.productName),
        datasets: [
          {
            label: 'Margen bruto ($)',
            data: top10.map((d) => d.grossMargin),
            backgroundColor: '#22c55e',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Top 10 Productos por Margen Bruto' } },
      },
    });
  }

  exportExcel(): void {
    const items = this.data.value();
    if (!items?.length) return;
    this.reportService.exportToExcel(
      items.map((d) => ({
        Producto: d.productName,
        Código: d.productCode,
        Ingresos: d.totalRevenue,
        COGS: d.totalCogs,
        'Margen bruto': d.grossMargin,
        'Margen %': d.marginPercent,
      })),
      'rentabilidad',
      'Rentabilidad',
    );
  }
}
