import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { LogisticsService } from '../../../core/services/logistics.service';
import type { PickingResponse, PickingStatus } from '../../../core/models/logistics.model';

const STATUS_COLORS: Record<PickingStatus, string> = {
  PLANNED: 'warn',
  IN_PROGRESS: 'accent',
  COMPLETED: 'primary',
  CANCELLED: '',
};

@Component({
  selector: 'app-picking-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    DatePipe,
  ],
  templateUrl: './picking-list.html',
  styleUrl: './picking-list.css',
})
export class PickingListComponent implements OnInit {
  private readonly service = inject(LogisticsService);
  readonly data = signal<PickingResponse[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(20);
  readonly columns = ['pickingNumber', 'pickingDate', 'warehouseId', 'status', 'actions'];

  readonly statusColor = (status: PickingStatus) => STATUS_COLORS[status];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.listPickings(this.page(), this.size()).subscribe({
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
}
