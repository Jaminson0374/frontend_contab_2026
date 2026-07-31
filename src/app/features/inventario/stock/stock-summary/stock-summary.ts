import { Component, inject, computed } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { StockService } from '../../../../core/services/stock.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';

@Component({
  selector: 'app-stock-summary',
  standalone: true,
  imports: [
    DecimalPipe,
    SlicePipe,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './stock-summary.html',
  styleUrl: './stock-summary.css',
})
export class StockSummaryComponent {
  readonly stockService = inject(StockService);
  readonly warehouseService = inject(WarehouseService);

  readonly activeWarehouses = computed(() =>
    (this.warehouseService.warehouses.value() ?? []).filter((w) => w.active),
  );

  readonly displayedColumns = [
    'productName',
    'batchId',
    'currentQuantity',
    'availableQuantity',
    'unitCost',
  ];

  readonly batchTypeLabels: Record<string, string> = {
    PARENT: 'Padre',
    CHILD: 'Hijo',
    STANDARD: 'Estándar',
  };

  getBatchTypeLabel(type: string | undefined): string {
    return type ? (this.batchTypeLabels[type] ?? type) : '';
  }

  onWarehouseChange(id: string): void {
    this.stockService.selectedWarehouseId.set(id);
  }
}
