import {
  Component,
  inject,
  effect,
  ElementRef,
  viewChild,
  PLATFORM_ID,
  DestroyRef,
} from '@angular/core';
import {
  CommonModule,
  isPlatformBrowser,
  CurrencyPipe,
  DecimalPipe,
  DatePipe,
} from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartConfiguration,
} from 'chart.js';
import { DashboardService } from '../../core/services/dashboard.service';
import { DianService } from '../../core/services/dian.service';
import { ReportService } from '../../core/services/report.service';
import type { SalesByPeriod } from '../../core/models/report.model';
import type { SalesByProduct } from '../../core/models/report.model';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatRippleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly reportService = inject(ReportService);
  readonly dianService = inject(DianService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly summary = this.dashboardService.summary;
  readonly recentActivity = this.dashboardService.recentActivity;
  readonly salesPeriodData = this.reportService.salesByPeriod;
  readonly salesProductData = this.reportService.salesByProduct;

  private readonly salesChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('salesChart');
  private readonly productsChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('productsChart');

  private salesChart?: Chart;
  private productsChart?: Chart;

  constructor() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.reportService.applyFilters(
      thirtyDaysAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0],
      undefined,
      'DAILY',
    );

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const salesCanvas = this.salesChartCanvas()?.nativeElement;
      const productsCanvas = this.productsChartCanvas()?.nativeElement;
      if (!salesCanvas || !productsCanvas) return;

      const periodData = this.salesPeriodData.value();
      const productData = this.salesProductData.value();

      if (periodData) {
        this.salesChart?.destroy();
        this.salesChart = this.buildSalesChart(salesCanvas, periodData);
      }

      if (productData) {
        this.productsChart?.destroy();
        this.productsChart = this.buildProductsChart(productsCanvas, productData);
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.salesChart?.destroy();
      this.productsChart?.destroy();
    });
  }

  private buildSalesChart(
    canvas: HTMLCanvasElement,
    data: SalesByPeriod[],
  ): Chart<'line', number[], string> {
    const labels = data.map((d) => d.period);
    const values = data.map((d) => d.totalRevenue);

    const config: ChartConfiguration<'line', number[], string> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ventas',
            data: values,
            fill: true,
            tension: 0.4,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            pointRadius: 3,
            pointBackgroundColor: '#3b82f6',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            cornerRadius: 6,
            padding: 10,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            ticks: { color: '#94a3b8' },
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              maxTicksLimit: 8,
              maxRotation: 0,
            },
          },
        },
      },
    };

    return new Chart(canvas, config);
  }

  private buildProductsChart(
    canvas: HTMLCanvasElement,
    data: SalesByProduct[],
  ): Chart<'bar', number[], string> {
    const top10 = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);

    const labels = top10.map((d) => d.productName);
    const values = top10.map((d) => d.totalRevenue);

    const config: ChartConfiguration<'bar', number[], string> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: values,
            backgroundColor: values.map((_, i) => `rgba(16, 185, 129, ${1 - i * 0.06})`),
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            cornerRadius: 6,
            padding: 10,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            ticks: { color: '#94a3b8' },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 12 },
            },
          },
        },
      },
    };

    return new Chart(canvas, config);
  }
}
