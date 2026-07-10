import { Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { DecimalPipe, CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ProductService } from '../../../../core/services/product.service';
import { UnitOfMeasureService } from '../../../../core/services/unit-of-measure.service';
import { WAREHOUSE_TYPE_LABELS } from '../../../../core/models/warehouse.model';
import { InventoryStock } from '../../../../core/models/stock.model';
import { PageResponse } from '../../../../core/models/page.model';
import { Product } from '../../../../core/models/product.model';

interface WarehouseStockRow {
  productId: string;
  productCode: string;
  description: string | null;
  stock: number;
  unitOfMeasure: string;
  costPrice: number;
  salePrice: number;
}

@Component({
  selector: 'app-warehouse-detail',
  standalone: true,
  imports: [
    DecimalPipe,
    CurrencyPipe,
    RouterLink,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
  ],
  templateUrl: './warehouse-detail.html',
  styleUrl: './warehouse-detail.css',
})
export class WarehouseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  readonly warehouseService = inject(WarehouseService);
  readonly productService = inject(ProductService);
  readonly uomService = inject(UnitOfMeasureService);

  readonly typeLabels = WAREHOUSE_TYPE_LABELS;

  readonly warehouseId = signal<string | null>(null);

  readonly stock = httpResource<InventoryStock[]>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    const id = this.warehouseId();
    return id ? `/api/v1/stock/warehouse/${id}` : undefined;
  });

  readonly warehouse = computed(() => {
    const id = this.warehouseId();
    const warehouses = this.warehouseService.warehouses.value() ?? [];
    return warehouses.find((w) => w.id === id);
  });

  readonly stockRows = computed(() => {
    const stocks = this.stock.value();
    const prods = this.productService.allProducts.value();
    const uoms = this.uomService.units.value();
    if (!stocks || !prods) return [] as WarehouseStockRow[];

    const productMap = new Map(prods.content.map((p) => [p.id, p]));
    const uomMap = new Map((uoms ?? []).map((u) => [u.id, u]));

    return stocks.map((s) => {
      const product = productMap.get(s.productId);
      const uom = product?.unitOfMeasureId ? uomMap.get(product.unitOfMeasureId) : null;
      return {
        productId: s.productId,
        productCode: product?.productCode ?? '',
        description: product?.description ?? product?.name ?? null,
        stock: s.currentQuantity,
        unitOfMeasure: uom?.name ?? uom?.code ?? '',
        costPrice: product?.costPrice ?? 0,
        salePrice: product?.salePrice ?? 0,
      };
    });
  });

  readonly displayedColumns = [
    'productCode',
    'description',
    'stock',
    'unitOfMeasure',
    'costPrice',
    'salePrice',
  ];

  readonly loading = computed(
    () =>
      this.stock.isLoading() ||
      this.productService.allProducts.isLoading() ||
      this.uomService.units.isLoading(),
  );

  readonly error = computed(() => this.stock.error() ?? this.productService.allProducts.error());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.warehouseId.set(id);
    }
  }
}
