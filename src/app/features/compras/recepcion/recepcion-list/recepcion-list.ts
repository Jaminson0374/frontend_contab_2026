import { Component, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { GoodsReceiptService } from '../../../../core/services/goods-receipt.service';
import type { GoodsReceipt } from '../../../../core/models/goods-receipt.model';

@Component({
  selector: 'app-recepcion-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DatePipe,
  ],
  templateUrl: './recepcion-list.html',
  styleUrl: './recepcion-list.css',
})
export class RecepcionListComponent implements OnInit {
  readonly service = inject(GoodsReceiptService);
  readonly router = inject(Router);

  readonly data = signal<GoodsReceipt[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(20);

  readonly displayedColumns = ['receiptDate', 'ocId', 'batches', 'deviations', 'actions'];

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

  viewOc(ocId: string): void {
    this.router.navigate(['/compras/ordenes', ocId]);
  }
}
