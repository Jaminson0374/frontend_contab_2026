import { Component, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { StockService } from '../../../../core/services/stock.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';

@Component({
  selector: 'app-stock-summary',
  standalone: true,
  imports: [DecimalPipe, MatSelectModule, MatTableModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './stock-summary.html',
  styleUrl: './stock-summary.css',
})
export class StockSummaryComponent {
  readonly stockService     = inject(StockService);
  readonly warehouseService = inject(WarehouseService);

  readonly activeWarehouses = computed(() =>
    (this.warehouseService.warehouses.value() ?? []).filter(w => w.active)
  );

  readonly displayedColumns = ['productId', 'batchId', 'currentQuantity', 'availableQuantity', 'unitCost'];

  onWarehouseChange(id: string): void {
    this.stockService.selectedWarehouseId.set(id);
  }
}
