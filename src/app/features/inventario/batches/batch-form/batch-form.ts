import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, switchMap, tap, of } from 'rxjs';
import { PageResponse } from '../../../../core/models/page.model';
import { BatchService } from '../../../../core/services/batch.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { ProductService } from '../../../../core/services/product.service';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { Product } from '../../../../core/models/product.model';
import type { PurchaseOrder } from '../../../../core/models/purchase-order.model';
import type { ReceiptResponse } from '../../../../core/models/logistics.model';

@Component({
  selector: 'app-batch-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
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
  private readonly ref = inject(MatDialogRef<BatchFormComponent>);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly searchingProducts = signal(false);

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
    initialWeight: [0, [Validators.required, Validators.min(0.001)]],
    purchaseCost: [0, [Validators.required, Validators.min(0)]],
    notes: [''],
    // Document origin fields
    sourceType: ['NONE' as 'NONE' | 'OC' | 'RECEIPT' | 'EXTERNAL'],
    ocId: [null as string | null],
    sourceReceiptId: [null as string | null],
    externalDocRef: [''],
  });

  readonly filteredProducts = signal<Product[]>([]);

  constructor() {
    this.form.controls.productSearch.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.searchingProducts.set(true)),
        switchMap((query) => {
          if (!query || query.length < 2) {
            this.searchingProducts.set(false);
            return of<Product[]>([]);
          }
          return this.productService
            .search(query, 0, 10)
            .pipe(tap(() => this.searchingProducts.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.searchingProducts.set(false);
        if (Array.isArray(result)) {
          this.filteredProducts.set(result);
        } else {
          this.filteredProducts.set(
            (result as PageResponse<Product>).content.filter(
              (p: Product) => p.inventoriable && p.active,
            ),
          );
        }
      });
  }

  displayProduct(product?: Product): string {
    return product ? `${product.name} (${product.productCode})` : '';
  }

  onProductSelected(product: Product): void {
    this.form.controls.productId.setValue(product.id);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const date =
      raw.entryDate instanceof Date ? raw.entryDate.toISOString().split('T')[0] : raw.entryDate;

    let finalNotes: string | null = raw.notes || null;

    // If EXTERNAL, append the external doc ref to notes
    if (raw.sourceType === 'EXTERNAL' && raw.externalDocRef) {
      const docNote = ` — Doc: ${raw.externalDocRef}`;
      finalNotes = (finalNotes ?? '') + docNote;
    }

    const request = {
      supplierId: raw.supplierId,
      warehouseId: raw.warehouseId,
      productId: raw.productId,
      entryDate: date,
      initialWeight: raw.initialWeight,
      purchaseCost: raw.purchaseCost,
      notes: finalNotes,
      ocId: raw.sourceType === 'OC' ? raw.ocId : null,
      sourceReceiptId: raw.sourceType === 'RECEIPT' ? raw.sourceReceiptId : null,
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
