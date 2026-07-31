import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { debounceTime, distinctUntilChanged, of } from 'rxjs';
import { PageResponse } from '../../../../core/models/page.model';
import { BatchService } from '../../../../core/services/batch.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { ProductService } from '../../../../core/services/product.service';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { UnitOfMeasureService } from '../../../../core/services/unit-of-measure.service';
import { Product } from '../../../../core/models/product.model';
import { UnitOfMeasure } from '../../../../core/models/product-catalog.model';
import type { PurchaseOrder } from '../../../../core/models/purchase-order.model';
import type { ReceiptResponse } from '../../../../core/models/logistics.model';

@Component({
  selector: 'app-batch-form',
  standalone: true,
  styleUrl: './batch-form.css',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatAutocompleteModule,
    MatTooltipModule,
    DragDropModule,
  ],
  templateUrl: './batch-form.html',
})
export class BatchFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly batchService = inject(BatchService);
  readonly warehouseService = inject(WarehouseService);
  readonly thirdPartyService = inject(ThirdPartyService);
  private readonly productService = inject(ProductService);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly logisticsService = inject(LogisticsService);
  readonly unitOfMeasureService = inject(UnitOfMeasureService);
  private readonly ref = inject(MatDialogRef<BatchFormComponent>);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);

  // UoM options
  readonly uomOptions = computed<UnitOfMeasure[]>(() =>
    (this.unitOfMeasureService.units.value() ?? []).filter((u) => u.active),
  );

  // Document origin signals
  readonly ocSearch = signal('');
  readonly ocOptions = signal<PurchaseOrder[]>([]);
  readonly searchingOc = signal(false);
  readonly receiptSearch = signal('');
  readonly receiptOptions = signal<ReceiptResponse[]>([]);
  readonly searchingReceipt = signal(false);

  readonly canalWarehouses = computed(() =>
    (this.warehouseService.warehouses.value() ?? []).filter(
      (w) => w.warehouseType === 'CANAL' && w.active,
    ),
  );

  readonly suppliers = computed(() =>
    (this.thirdPartyService.supplierOptions.value() ?? []).filter((tp) => tp.active),
  );

  readonly form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    productId: ['', Validators.required],
    productSearch: [''],
    entryDate: [new Date(), Validators.required],
    expirationDate: [null as string | null],
    unitOfMeasureId: [null as string | null],
    initialWeight: [0, [Validators.required, Validators.min(0.001)]],
    purchaseCost: [0, [Validators.required, Validators.min(0)]],
    notes: [''],
    sourceType: ['NONE' as 'NONE' | 'OC' | 'RECEIPT' | 'EXTERNAL'],
    ocId: [null as string | null],
    sourceReceiptId: [null as string | null],
    externalDocRef: [''],
  });

  // ── Product search panel ──────────────────────────────────────────
  readonly showProductPanel = signal(false);
  readonly productPanelLoading = signal(false);
  readonly productPanelData = signal<PageResponse<Product> | null>(null);
  readonly productPanelPage = signal(0);
  readonly productPanelSize = signal(10);
  readonly selectedProduct = signal<Product | null>(null);

  readonly productColumns = ['productCode', 'name', 'totalStock', 'salePrice'];

  constructor() {
    this.form.controls.productSearch.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        if (this.showProductPanel()) {
          this.loadProducts(query, 0, this.productPanelSize());
        }
      });
  }

  openProductPanel(): void {
    this.showProductPanel.set(true);
    const currentQuery = this.form.controls.productSearch.value;
    this.loadProducts(currentQuery, 0, this.productPanelSize());
  }

  closeProductPanel(): void {
    this.showProductPanel.set(false);
    this.productPanelData.set(null);
  }

  clearProductSelection(): void {
    this.selectedProduct.set(null);
    this.form.controls.productSearch.reset();
    this.form.controls.productId.reset();
    this.form.controls.unitOfMeasureId.reset();
  }

  focusFirstProductRow(): void {
    if (!this.showProductPanel()) return;
    setTimeout(() => {
      const rows = document.querySelectorAll<HTMLElement>('.product-panel-table .mat-mdc-row');
      rows[0]?.focus();
    });
  }

  onProductRowKeydown(event: KeyboardEvent, row: Product): void {
    const rows = document.querySelectorAll<HTMLElement>('.product-panel-table .mat-mdc-row');
    const current = document.activeElement as HTMLElement;
    const currentIndex = Array.from(rows).indexOf(current);

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.selectProduct(row);
        break;
      case 'Escape':
        event.preventDefault();
        this.closeProductPanel();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex >= 0 && currentIndex < rows.length - 1) {
          rows[currentIndex + 1].focus();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          rows[currentIndex - 1].focus();
        } else {
          this.closeProductPanel();
        }
        break;
      case 'PageDown':
        event.preventDefault();
        if (rows.length > 0) {
          const target = Math.min(currentIndex + 5, rows.length - 1);
          rows[target].focus();
        }
        break;
      case 'PageUp':
        event.preventDefault();
        if (rows.length > 0) {
          const target = Math.max(currentIndex - 5, 0);
          rows[target].focus();
        }
        break;
      case 'Home':
        event.preventDefault();
        if (rows.length > 0) rows[0].focus();
        break;
      case 'End':
        event.preventDefault();
        if (rows.length > 0) rows[rows.length - 1].focus();
        break;
    }
  }

  selectProduct(product: Product): void {
    this.selectedProduct.set(product);
    this.form.controls.productId.setValue(product.id);
    this.form.controls.productSearch.setValue(`${product.name} (${product.productCode})`);
    if (product.unitOfMeasureId) {
      this.form.controls.unitOfMeasureId.setValue(product.unitOfMeasureId);
    }
    this.closeProductPanel();
  }

  isSelectedRow(product: Product): boolean {
    return this.selectedProduct()?.id === product.id;
  }

  loadProducts(query: string, page: number, size: number): void {
    this.productPanelLoading.set(true);
    this.productService.search(query, page, size).subscribe({
      next: (result) => {
        this.productPanelLoading.set(false);
        const filtered = Array.isArray(result)
          ? {
              content: result.filter((p) => p.inventoriable && p.active),
              page: 0,
              size: result.length,
              totalElements: result.length,
              totalPages: 1,
              last: true,
            }
          : { ...result, content: result.content.filter((p) => p.inventoriable && p.active) };
        this.productPanelData.set(filtered);
        this.productPanelPage.set(filtered.page);
      },
      error: () => {
        this.productPanelLoading.set(false);
        this.productPanelData.set(null);
      },
    });
  }

  onProductPageChange(event: PageEvent): void {
    const query = this.form.controls.productSearch.value;
    this.productPanelPage.set(event.pageIndex);
    this.productPanelSize.set(event.pageSize);
    this.loadProducts(query, event.pageIndex, event.pageSize);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const formatDate = (d: string | Date | null): string | null => {
      if (!d) return null;
      return d instanceof Date ? d.toISOString().split('T')[0] : d;
    };
    const entryDateRaw =
      raw.entryDate instanceof Date
        ? raw.entryDate.toISOString().split('T')[0]
        : String(raw.entryDate);
    const expirationDateRaw = formatDate(raw.expirationDate as string | Date | null);

    let finalNotes: string | null = raw.notes || null;

    // If EXTERNAL, append the external doc ref to notes
    if (raw.sourceType === 'EXTERNAL' && raw.externalDocRef) {
      const docNote = ` — Doc: ${raw.externalDocRef}`;
      finalNotes = (finalNotes ?? '') + docNote;
    }

    // batchType: PARENT when document origin is present, else STANDARD
    const batchType: string = raw.sourceType && raw.sourceType !== 'NONE' ? 'PARENT' : 'STANDARD';

    const request = {
      supplierId: raw.supplierId,
      warehouseId: raw.warehouseId,
      productId: raw.productId,
      entryDate: entryDateRaw,
      initialWeight: raw.initialWeight,
      purchaseCost: raw.purchaseCost,
      notes: finalNotes,
      ocId: raw.sourceType === 'OC' ? raw.ocId : null,
      sourceReceiptId: raw.sourceType === 'RECEIPT' ? raw.sourceReceiptId : null,
      expirationDate: expirationDateRaw,
      batchType,
      unitOfMeasureId: raw.unitOfMeasureId,
    };

    this.batchService.create(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }

  cancel(): void {
    this.ref.close(false);
  }

  // ── Document origin methods ──────────────────────────────────────────

  onSourceTypeChange(): void {
    const type = this.form.get('sourceType')?.value;

    if (type !== 'OC') {
      this.form.get('ocId')?.reset();
      this.ocSearch.set('');
      this.ocOptions.set([]);
    }
    if (type !== 'RECEIPT') {
      this.form.get('sourceReceiptId')?.reset();
      this.receiptSearch.set('');
      this.receiptOptions.set([]);
    }
    if (type !== 'EXTERNAL') {
      this.form.get('externalDocRef')?.reset();
    }
  }

  onOcInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.ocSearch.set(value);
    this.searchOc(value);
  }

  onReceiptInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.receiptSearch.set(value);
    this.searchReceipt(value);
  }

  searchOc(query: string): void {
    if (!query || query.length < 2) {
      this.ocOptions.set([]);
      return;
    }
    this.searchingOc.set(true);
    this.purchaseOrderService.searchByNumber(query).subscribe({
      next: (results) => {
        this.searchingOc.set(false);
        this.ocOptions.set(results);
      },
      error: () => {
        this.searchingOc.set(false);
        this.ocOptions.set([]);
      },
    });
  }

  searchReceipt(query: string): void {
    if (!query || query.length < 2) {
      this.receiptOptions.set([]);
      return;
    }
    this.searchingReceipt.set(true);
    this.logisticsService.listReceipts(0, 50).subscribe({
      next: (page) => {
        this.searchingReceipt.set(false);
        const filtered = page.content.filter((r) =>
          r.receiptNumber.toLowerCase().includes(query.toLowerCase()),
        );
        this.receiptOptions.set(filtered);
      },
      error: () => {
        this.searchingReceipt.set(false);
        this.receiptOptions.set([]);
      },
    });
  }

  onOcSelected(po: PurchaseOrder): void {
    this.form.get('ocId')?.setValue(po.id);
    this.form.get('sourceReceiptId')?.reset();
    this.ocSearch.set(po.documentNumber);
  }

  onReceiptSelected(receipt: ReceiptResponse): void {
    this.form.get('sourceReceiptId')?.setValue(receipt.id);
    this.form.get('ocId')?.reset();
    this.receiptSearch.set(receipt.receiptNumber);
  }
}
