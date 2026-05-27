import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { LogisticsService } from '../../../core/services/logistics.service';
import type { ShipmentResponse, ShipmentStatus } from '../../../core/models/logistics.model';

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  DRAFT: '',
  CONFIRMED: 'accent',
  IN_TRANSIT: 'warn',
  DELIVERED: 'primary',
  CANCELLED: '',
};

@Component({
  selector: 'app-shipment-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    DatePipe,
  ],
  templateUrl: './shipment-list.html',
  styleUrl: './shipment-list.css',
})
export class ShipmentListComponent implements OnInit {
  private readonly service = inject(LogisticsService);
  readonly data = signal<ShipmentResponse[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(20);
  readonly columns = [
    'shipmentNumber',
    'shipmentDate',
    'carrierName',
    'driverName',
    'status',
    'actions',
  ];

  readonly statusColor = (status: ShipmentStatus) => STATUS_COLORS[status];

  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.service.listShipments(this.page(), this.size()).subscribe({
      next: (res) => {
        this.data.set(res.content);
        this.total.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  onPage(event: PageEvent) {
    this.page.set(event.pageIndex);
    this.size.set(event.pageSize);
    this.load();
  }
}
