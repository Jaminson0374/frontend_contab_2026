import { Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ProductionOrderService } from '../../../core/services/production-order.service';
import type { ProductionOrder } from '../../../core/models/production-order.model';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    SlicePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './order-list.html',
  styles: [
    '.ol-page{max-width:1100px;margin:0 auto;padding:1rem} .ol-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem} .ol-title{font-size:1.25rem;font-weight:600} .spinner-container{display:flex;justify-content:center;padding:32px} .error-msg{color:#ef4444;text-align:center} .empty-msg{text-align:center;color:#94a3b8;padding:24px} .ol-table{width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden} .chip-planned{background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:12px;font-size:.75rem;font-weight:600} .chip-approved{background:#dcfce7;color:#15803d;padding:2px 10px;border-radius:12px;font-size:.75rem;font-weight:600} .chip-inprogress{background:#fef3c7;color:#d97706;padding:2px 10px;border-radius:12px;font-size:.75rem;font-weight:600} .chip-completed{background:#e0e7ff;color:#4338ca;padding:2px 10px;border-radius:12px;font-size:.75rem;font-weight:600} .chip-cancelled{background:#fee2e2;color:#dc2626;padding:2px 10px;border-radius:12px;font-size:.75rem;font-weight:600}',
  ],
})
export class OrderListComponent implements OnInit {
  private readonly service = inject(ProductionOrderService);
  readonly loading = signal(false);
  readonly data = signal<{ content: ProductionOrder[]; totalElements: number } | null>(null);
  readonly page = signal(0);
  readonly size = signal(20);
  readonly cols = [
    'orderNumber',
    'plannedDate',
    'formulaId',
    'plannedQuantity',
    'status',
    'warehouseId',
    'actions',
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list({ page: this.page(), size: this.size() }).subscribe({
      next: (p) => {
        this.data.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onPageChange(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.size.set(e.pageSize);
    this.load();
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'PLANNED':
        return 'Planificada';
      case 'APPROVED':
        return 'Aprobada';
      case 'IN_PROGRESS':
        return 'En proceso';
      case 'COMPLETED':
        return 'Completada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return s;
    }
  }

  statusClass(s: string): string {
    return 'chip-' + s.toLowerCase();
  }

  approve(id: string): void {
    this.service.approve(id).subscribe({ next: () => this.load() });
  }
  cancel(id: string): void {
    this.service.cancel(id).subscribe({ next: () => this.load() });
  }
}
