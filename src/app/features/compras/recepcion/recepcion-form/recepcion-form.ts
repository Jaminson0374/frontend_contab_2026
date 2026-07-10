import { Component, computed, DestroyRef, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { GoodsReceiptService } from '../../../../core/services/goods-receipt.service';
import type {
  PurchaseLineItemResponse,
  PurchaseOrder,
} from '../../../../core/models/purchase-order.model';
import type {
  GoodsReceiptRequest,
  ReceiptResponse,
} from '../../../../core/models/goods-receipt.model';

type ReceiptLineForm = FormGroup<{
  productId: FormControl<string>;
  warehouseId: FormControl<string>;
  receivedQty: FormControl<number>;
  actualCost: FormControl<number>;
}>;

@Component({
  selector: 'app-recepcion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './recepcion-form.html',
  styleUrl: './recepcion-form.css',
})
export class RecepcionFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly purchaseOrderService = inject(PurchaseOrderService);
  private readonly goodsReceiptService = inject(GoodsReceiptService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ocId = signal('');
  readonly ocSearchControl = new FormControl('', { nonNullable: true });
  readonly ocSearchResults = signal<PurchaseOrder[]>([]);
  readonly ocSearching = signal(false);

  readonly oc = signal<PurchaseOrder | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal<ReceiptResponse | null>(null);

  readonly linesArray = this.fb.array<ReceiptLineForm>([]);

  readonly ocSummary = computed(() => {
    const order = this.oc();
    if (!order) return null;
    return {
      supplierName: order.supplierName,
      orderDate: order.orderDate,
      status: order.status,
      totalLines: order.lines?.length ?? 0,
    };
  });

  private readonly ocLines = computed<PurchaseLineItemResponse[]>(() => this.oc()?.lines ?? []);

  readonly lineDeviations = computed(() => {
    const formLines = this.linesArray.getRawValue();
    const ocLines = this.ocLines();
    return formLines.map((line, i) => {
      const ocLine = ocLines[i];
      if (!ocLine || !ocLine.unitCost) return null;
      const actual: number = line.actualCost as number;
      if (!actual && actual !== 0) return null;
      const pct = (Math.abs(actual - ocLine.unitCost) / ocLine.unitCost) * 100;
      return { index: i, deviationPct: pct };
    });
  });

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('ocId') ?? '';
    this.ocId.set(id);

    if (id) {
      this.loadOrder();
    } else {
      this.loading.set(false);
      this.setupOcSearch();
    }
  }

  private setupOcSearch(): void {
    this.ocSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((q) => typeof q === 'string' && q.trim().length >= 2),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((q) => {
        this.ocSearching.set(true);
        this.purchaseOrderService.searchByNumber((q as string).trim()).subscribe({
          next: (results) => {
            this.ocSearchResults.set(results ?? []);
            this.ocSearching.set(false);
          },
          error: () => {
            this.ocSearchResults.set([]);
            this.ocSearching.set(false);
          },
        });
      });
  }

  onOcSelected(event: MatAutocompleteSelectedEvent): void {
    const selected = event.option.value as PurchaseOrder;
    this.ocId.set(selected.id);
    this.ocSearchControl.setValue(this.formatOcOption(selected), { emitEvent: false });
    this.ocSearchResults.set([]);
    this.loadOrder();
  }

  displayOcOption = (order: PurchaseOrder | null): string => {
    return order ? this.formatOcOption(order) : '';
  };

  private formatOcOption(order: PurchaseOrder): string {
    return `${order.documentNumber} — ${order.supplierName}`;
  }

  private loadOrder(): void {
    const id = this.ocId();
    if (!id) {
      this.loading.set(false);
      this.loadError.set('No se proporcionó el ID de la orden de compra.');
      return;
    }

    this.purchaseOrderService.getById(id).subscribe({
      next: (order) => {
        this.oc.set(order);
        this.loading.set(false);
        this.buildLinesFromOrder(order);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Error al cargar la orden de compra.');
      },
    });
  }

  private buildLinesFromOrder(order: PurchaseOrder): void {
    this.linesArray.clear();
    (order.lines ?? []).forEach((line) => {
      this.linesArray.push(this.createLineGroup(line));
    });
  }

  private createLineGroup(ocLine: PurchaseLineItemResponse): ReceiptLineForm {
    const remaining = Math.max(0, ocLine.orderedQty - (ocLine.receivedQty ?? 0));
    return this.fb.group({
      productId: this.fb.control<Partial<{ value: string; disabled: boolean }>>({
        value: ocLine.productId,
        disabled: true,
      }) as unknown as FormControl<string>,
      warehouseId: this.fb.control<Partial<{ value: string; disabled: boolean }>>({
        value: ocLine.warehouseId,
        disabled: true,
      }) as unknown as FormControl<string>,
      receivedQty: this.fb.nonNullable.control(remaining, [
        Validators.required,
        Validators.min(0.001),
        Validators.max(remaining),
      ]),
      actualCost: this.fb.nonNullable.control(ocLine.unitCost, [
        Validators.required,
        Validators.min(0),
      ]),
    }) as unknown as ReceiptLineForm;
  }

  readonly canSubmit = computed(() => {
    if (this.linesArray.invalid || this.submitting() || this.submitSuccess()) return false;
    const lines = this.linesArray.getRawValue();
    return lines.some((l) => (l.receivedQty as number) > 0);
  });

  goBack(): void {
    const id = this.ocId();
    if (id) {
      this.router.navigate(['/compras/ordenes', id]);
    } else {
      this.router.navigate(['/compras/ordenes']);
    }
  }

  createInvoice(): void {
    const id = this.ocId();
    const supplierId = this.oc()?.supplierId;

    if (id && supplierId) {
      this.router.navigate(['/compras/facturas/nueva'], {
        queryParams: { ocId: id, supplierId },
      });
    } else {
      this.router.navigate(['/compras/facturas/nueva']);
    }
  }

  submit(): void {
    this.submitError.set(null);
    this.submitSuccess.set(null);

    if (this.linesArray.invalid) {
      this.linesArray.controls.forEach((c) => c.markAllAsTouched());
      return;
    }

    const id = this.ocId();
    if (!id) {
      this.submitError.set('No se pudo identificar la orden de compra.');
      return;
    }

    this.submitting.set(true);

    const rawLines = this.linesArray.getRawValue();

    const request: GoodsReceiptRequest = {
      ocId: id,
      lines: rawLines
        .filter((l) => (l.receivedQty as number) > 0)
        .map((l) => ({
          productId: l.productId as string,
          warehouseId: l.warehouseId as string,
          receivedQty: l.receivedQty as number,
          actualCost: l.actualCost as number,
        })),
    };

    this.goodsReceiptService.create(request).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.submitSuccess.set(response);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.submitError.set(this.extractErrorMessage(err, 'Error al registrar la recepción.'));
      },
    });
  }

  getLineProductName(index: number): string {
    const ocLines = this.ocLines();
    return ocLines[index]?.productName ?? `Línea ${index + 1}`;
  }

  getLineOrderedQty(index: number): number {
    return this.ocLines()[index]?.orderedQty ?? 0;
  }

  getLineReceivedQty(index: number): number {
    return this.ocLines()[index]?.receivedQty ?? 0;
  }

  getLineUnitCost(index: number): number {
    return this.ocLines()[index]?.unitCost ?? 0;
  }

  getLineRemaining(index: number): number {
    const ocLine = this.ocLines()[index];
    if (!ocLine) return 0;
    return Math.max(0, ocLine.orderedQty - (ocLine.receivedQty ?? 0));
  }

  getLineDeviationPct(index: number): number {
    const dev = this.lineDeviations()[index];
    return dev?.deviationPct ?? 0;
  }

  isDeviationWarning(index: number): boolean {
    return this.getLineDeviationPct(index) > 20;
  }

  getLineDeviationClass(index: number): string {
    return this.isDeviationWarning(index) ? 'deviation-warning' : 'deviation-ok';
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error.trim();
      }
      if (error.error && typeof error.error === 'object') {
        const msg = (error.error as { message?: string }).message;
        if (typeof msg === 'string' && msg.trim()) {
          return msg.trim();
        }
      }
      if (error.message) {
        return error.message;
      }
    }
    return fallback;
  }
}
