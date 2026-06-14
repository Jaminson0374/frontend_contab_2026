import { Component, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { PurchaseReturnService } from '../../../../core/services/purchase-return.service';
import type { PurchaseReturnResponse } from '../../../../core/models/purchase-return.model';

@Component({
  selector: 'app-devolucion-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DatePipe,
  ],
  templateUrl: './devolucion-list.html',
  styleUrl: './devolucion-list.css',
})
export class DevolucionListComponent implements OnInit {
  readonly service = inject(PurchaseReturnService);
  readonly router = inject(Router);

  readonly data = signal<PurchaseReturnResponse[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(20);

  readonly displayedColumns = [
    'documentNumber',
    'returnDate',
    'receiptId',
    'reason',
    'totalReturned',
    'status',
    'actions',
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list(this.page(), this.size()).subscribe({
      next: (res) => {
        this.data.set(res.content);
        this.total.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.size.set(event.pageSize);
    this.load();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }

  viewReceipt(receiptId: string): void {
    this.router.navigate(['/compras/recepcion']);
  }
}
