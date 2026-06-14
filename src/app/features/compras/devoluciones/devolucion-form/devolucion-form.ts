import { Component, computed, inject, signal } from '@angular/core';
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
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { GoodsReceiptService } from '../../../../core/services/goods-receipt.service';
import { PurchaseReturnService } from '../../../../core/services/purchase-return.service';
import type { GoodsReceipt } from '../../../../core/models/goods-receipt.model';
import type {
  PurchaseReturnRequest,
  PurchaseReturnResponse,
} from '../../../../core/models/purchase-return.model';

type ReturnLineForm = FormGroup<{
  productId: FormControl<string>;
  warehouseId: FormControl<string>;
  batchId: FormControl<string>;
  returnQty: FormControl<number>;
  unitCost: FormControl<number>;
}>;

@Component({
  selector: 'app-devolucion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './devolucion-form.html',
  styleUrl: './devolucion-form.css',
})
export class DevolucionFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly receiptService = inject(GoodsReceiptService);
  private readonly returnService = inject(PurchaseReturnService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly receipt = signal<GoodsReceipt | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal<PurchaseReturnResponse | null>(null);

  readonly form = this.fb.nonNullable.group({
    receiptId: ['', Validators.required],
    reason: ['', Validators.required],
  });

  readonly linesArray = this.fb.array<ReturnLineForm>([]);

  readonly totalReturned = computed(() =>
    this.linesArray
      .getRawValue()
      .reduce((sum, l) => sum + (l.returnQty || 0) * (l.unitCost || 0), 0),
  );

  readonly canSubmit = computed(() => {
    if (this.form.invalid || this.linesArray.invalid || this.saving() || this.submitSuccess()) {
      return false;
    }
    const lines = this.linesArray.getRawValue();
    return lines.length > 0 && lines.some((l) => (l.returnQty as number) > 0);
  });

  constructor() {
    const receiptId = this.route.snapshot.queryParamMap.get('receiptId');
    if (receiptId) {
      this.form.controls.receiptId.setValue(receiptId);
      this.loadReceipt(receiptId);
    }
  }

  loadReceipt(id?: string): void {
    const receiptId = id ?? this.form.controls.receiptId.value;
    if (!receiptId) return;

    this.loading.set(true);
    this.loadError.set(null);
    this.receipt.set(null);

    this.receiptService.getById(receiptId).subscribe({
      next: (r) => {
        this.receipt.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se encontró la remisión especificada.');
      },
    });
  }

  addLine(): void {
    this.linesArray.push(
      this.fb.group({
        productId: this.fb.nonNullable.control<string>('', Validators.required),
        warehouseId: this.fb.nonNullable.control<string>('', Validators.required),
        batchId: this.fb.nonNullable.control<string>('', Validators.required),
        returnQty: this.fb.nonNullable.control<number>(0, [
          Validators.required,
          Validators.min(0.001),
        ]),
        unitCost: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(0)]),
      }) as unknown as ReturnLineForm,
    );
  }

  removeLine(index: number): void {
    this.linesArray.removeAt(index);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }

  goBack(): void {
    this.router.navigate(['/compras/devoluciones']);
  }

  submit(): void {
    this.submitError.set(null);
    this.submitSuccess.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.linesArray.length === 0) {
      this.submitError.set('Debe agregar al menos una línea de devolución.');
      return;
    }

    if (this.linesArray.invalid) {
      this.linesArray.controls.forEach((c) => c.markAllAsTouched());
      return;
    }

    const receiptId = this.form.controls.receiptId.value;
    if (!receiptId) {
      this.submitError.set('Debe seleccionar una remisión.');
      return;
    }

    this.saving.set(true);

    const rawLines = this.linesArray.getRawValue();

    const request: PurchaseReturnRequest = {
      receiptId,
      reason: this.form.controls.reason.value,
      items: rawLines
        .filter((l) => (l.returnQty as number) > 0)
        .map((l) => ({
          productId: l.productId as string,
          warehouseId: l.warehouseId as string,
          batchId: l.batchId as string,
          returnQty: l.returnQty as number,
          unitCost: l.unitCost as number,
        })),
    };

    this.returnService.create(request).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.submitSuccess.set(response);
        Swal.fire({
          icon: 'success',
          title: 'Devolución registrada',
          text: `Documento ${response.documentNumber}`,
          confirmButtonColor: '#15803d',
        });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.submitError.set(this.extractErrorMessage(err, 'Error al registrar la devolución.'));
      },
    });
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
