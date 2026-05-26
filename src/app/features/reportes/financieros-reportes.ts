import { Component, inject, viewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CurrencyPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReportService } from '../../core/services/report.service';
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
import type { IncomeStatement } from '../../core/models/report.model';

Chart.register(BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

@Component({
  selector: 'app-financieros-reportes',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './financieros-reportes.html',
  styleUrl: './financieros-reportes.css',
})
export class FinancierosReportesComponent {
  private readonly reportService = inject(ReportService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly fromControl = new FormControl('');
  readonly toControl = new FormControl('');

  readonly data = this.reportService.incomeStatement;

  readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('pnlChart');
  private chart: Chart | null = null;

  applyFilters(): void {
    const from = this.fromControl.value || '';
    const to = this.toControl.value || '';
    this.reportService.applyFilters(from, to);
    this.renderChart();
  }

  private renderChart(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const stmt = this.data.value();
    if (!stmt) return;
    this.chart?.destroy();
    const canvas = this.chartCanvas()?.nativeElement;
    if (!canvas) return;

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Ingresos', 'COGS', 'Gastos', 'Neto'],
        datasets: [
          {
            label: 'Estado de Resultados',
            data: [stmt.totalRevenue, stmt.totalCogs, stmt.totalExpenses, stmt.netIncome],
            backgroundColor: [
              '#22c55e',
              '#ef4444',
              '#f97316',
              stmt.netIncome < 0 ? '#ef4444' : '#22c55e',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Estado de Resultados' },
          legend: { display: false },
        },
      },
    });
  }

  exportExcel(): void {
    const stmt = this.data.value();
    if (!stmt) return;
    const rows: Record<string, unknown>[] = [
      { Concepto: 'Ingresos', Monto: stmt.totalRevenue },
      { Concepto: 'COGS', Monto: stmt.totalCogs },
      { Concepto: 'Margen Bruto', Monto: stmt.grossMargin },
      { Concepto: 'Gastos', Monto: stmt.totalExpenses },
      { Concepto: 'Resultado Neto', Monto: stmt.netIncome },
    ];
    this.reportService.exportToExcel(rows, 'estado_resultados', 'P&L');
  }
}
