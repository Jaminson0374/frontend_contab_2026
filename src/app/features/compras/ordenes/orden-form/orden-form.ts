import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { ProductService } from '../../../../core/services/product.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { QuickCreateSupplierDialogComponent } from '../../../admin/products/dialogs/quick-create-supplier.dialog';
import type {
  ThirdParty,
  ThirdPartySupplierOption,
} from '../../../../core/models/third-party.model';
import type {
  PurchaseOrder,
  PurchaseOrderRequest,
} from '../../../../core/models/purchase-order.model';
import type { Warehouse } from '../../../../core/models/warehouse.model';
import type { Product } from '../../../../core/models/product.model';

type LineForm = FormGroup<{
  productId: FormControl<string>;
  productDisplay: FormControl<string>;
  warehouseId: FormControl<string>;
  orderedQty: FormControl<number>;
  unitCost: FormControl<number>;
}>;

@Component({
  selector: 'app-orden-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './orden-form.html',
  styleUrl: './orden-form.css',
})
export class OrdenFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PurchaseOrderService);
  readonly productService = inject(ProductService);
  private readonly warehouseService = inject(WarehouseService);
  readonly thirdPartyService = inject(ThirdPartyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEditing = signal(false);
  private loadedId: string | null = null;
  readonly orderStatus = signal<string | null>(null);
  readonly productSearch = signal<Record<number, string>>({});

  // ── Supplier autocomplete ────────────────────────────────────────
  readonly supplierDisplay = new FormControl('', { nonNullable: true });

  readonly suppliers = computed(() => this.thirdPartyService.supplierOptions.value() ?? []);

  // ── Catalog data ──────────────────────────────────────────────────
  readonly products = computed(() => this.productService.products.value()?.content ?? []);
  readonly warehouses = computed(() => this.warehouseService.warehouses.value() ?? []);

  // ── Main form ─────────────────────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
    orderDate: [new Date(), Validators.required],
    notes: [''],
    linesArray: this.fb.array<LineForm>([]),
  });

  readonly linesArray = this.form.controls.linesArray;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      this.error.set(null);

      if (!id) {
        this.loadedId = null;
        this.isEditing.set(false);
        this.orderStatus.set(null);
        this.resetForm();
      } else {
        this.loadedId = id;
        this.isEditing.set(true);
        this.loadOrder(id);
      }
    });
  }

  private resetForm(): void {
    this.form.reset({ orderDate: new Date(), notes: '', supplierId: '' });
    this.supplierDisplay.setValue('');
    this.linesArray.clear();
    this.addLine();
  }

  private loadOrder(id: string): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (order) => {
        this.loading.set(false);
        this.orderStatus.set(order.status);
        this.loadIntoForm(order);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar la orden de compra.');
      },
    });
  }

  private loadIntoForm(order: PurchaseOrder): void {
    this.form.patchValue({
      supplierId: order.supplierId,
      orderDate: new Date(order.orderDate),
      notes: order.notes ?? '',
    });
    this.syncSupplierDisplay();

    this.linesArray.clear();
    (order.lines ?? []).forEach((line) => this.linesArray.push(this.createLineGroup(line)));
    if (this.linesArray.length === 0) {
      this.addLine();
    }
  }

  private createLineGroup(existing?: Partial<LineForm['value']>): LineForm {
    return this.fb.nonNullable.group({
      productId: [existing?.productId ?? '', Validators.required],
      productDisplay: [this.getProductName(existing?.productId) ?? ''],
      warehouseId: [existing?.warehouseId ?? '', Validators.required],
      orderedQty: [existing?.orderedQty ?? 1, [Validators.required, Validators.min(0.001)]],
      unitCost: [existing?.unitCost ?? 0, [Validators.required, Validators.min(0)]],
    }) as unknown as LineForm;
  }

  private getProductName(productId: string | undefined): string {
    if (!productId) return '';
    const p = this.products().find((pr) => pr.id === productId);
    return p ? `${p.productCode} — ${p.name}` : '';
  }

  // ── Supplier ──────────────────────────────────────────────────────
  onSupplierSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.supplierDisplay.setValue('', { emitEvent: false });
      this.openCreateSupplier();
      return;
    }
    this.form.controls.supplierId.setValue(ev.option.value);
    this.supplierDisplay.setValue(ev.option.viewValue, { emitEvent: false });
  }

  syncSupplierDisplay(): void {
    const id = this.form.controls.supplierId.getRawValue();
    const s = this.suppliers().find((tp) => tp.id === id);
    this.supplierDisplay.setValue(s ? `${s.name} (${s.numIdentification})` : '', {
      emitEvent: false,
    });
  }

  private openCreateSupplier(): void {
    this.dialog
      .open<QuickCreateSupplierDialogComponent, undefined, ThirdParty>(
        QuickCreateSupplierDialogComponent,
        { disableClose: true, width: '440px' },
      )
      .afterClosed()
      .subscribe((supplier) => {
        if (!supplier) return;
        this.thirdPartyService.reload();
        this.form.controls.supplierId.setValue(supplier.id);
        this.supplierDisplay.setValue(`${supplier.name} (${supplier.numIdentification})`, {
          emitEvent: false,
        });
      });
  }

  supplierLabel(tp: ThirdPartySupplierOption): string {
    const fullName = [tp.name, tp.lastName].filter(Boolean).join(' ');
    const status = tp.active ? '' : ' — inactivo';
    return `${fullName} (${tp.numIdentification})${status}`;
  }

  // ── Lines ─────────────────────────────────────────────────────────
  addLine(): void {
    this.linesArray.push(this.createLineGroup());
  }

  removeLine(index: number): void {
    if (this.linesArray.length <= 1) return;
    this.linesArray.removeAt(index);
  }

  // ── Line product autocomplete ─────────────────────────────────────
  onProductSearch(lineIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.productSearch.update((v) => ({ ...v, [lineIndex]: input.value }));
  }

  filteredProducts(lineIndex: number): Product[] {
    const q = (this.productSearch()[lineIndex] ?? '').toLowerCase().trim();
    if (!q) return this.products().filter((p) => p.active);
    return this.products().filter(
      (p) =>
        p.active && (p.name.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q)),
    );
  }

  onLineProductSelected(index: number, ev: MatAutocompleteSelectedEvent): void {
    const line = this.linesArray.at(index);
    const product = this.products().find((p) => p.id === ev.option.value);
    line.controls.productId.setValue(ev.option.value);
    line.controls.productDisplay.setValue(
      product ? `${product.productCode} — ${product.name}` : ev.option.viewValue,
    );
  }

  syncLineProductDisplay(index: number): void {
    const line = this.linesArray.at(index);
    const pid = line.controls.productId.getRawValue();
    if (pid && line.controls.productDisplay.getRawValue()) return;
    line.controls.productDisplay.setValue(this.getProductName(pid));
  }

  // ── Save ──────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid || this.linesArray.invalid) {
      this.form.markAllAsTouched();
      this.linesArray.controls.forEach((c) => c.markAllAsTouched());
      return;
    }

    const raw = this.form.getRawValue();
    const date =
      raw.orderDate instanceof Date ? raw.orderDate.toISOString().split('T')[0] : raw.orderDate;

    const request: PurchaseOrderRequest = {
      supplierId: raw.supplierId,
      orderDate: date,
      notes: raw.notes || null,
      lines: this.linesArray.getRawValue().map((line, idx) => ({
        productId: line.productId,
        warehouseId: line.warehouseId,
        orderedQty: line.orderedQty,
        unitCost: line.unitCost,
        lineNumber: idx + 1,
      })),
    };

    this.saving.set(true);
    this.error.set(null);

    const action = this.loadedId
      ? this.service.update(this.loadedId, request)
      : this.service.create(request);

    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['..'], { relativeTo: this.route });
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Error al guardar la orden de compra.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  recibir(): void {
    if (!this.loadedId) return;
    this.router.navigate(['/compras/recepcion/nueva'], { queryParams: { ocId: this.loadedId } });
  }
}
