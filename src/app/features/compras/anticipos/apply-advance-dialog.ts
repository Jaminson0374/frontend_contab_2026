import { Component, inject, Inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Advance, ApplyAdvanceRequest } from '../../../core/models/advance.model';
import { AdvanceService } from '../../../core/services/advance.service';
import { SupplierInvoiceService } from '../../../core/services/supplier-invoice.service';
import type { SupplierInvoice } from '../../../core/models/supplier-invoice.model';

@Component({
  selector: 'app-apply-advance-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './apply-advance-dialog.html',
})
export class ApplyAdvanceDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ApplyAdvanceDialogComponent>);
  private readonly advanceService = inject(AdvanceService);
  private readonly invoiceService = inject(SupplierInvoiceService);
  readonly data: Advance = inject(MAT_DIALOG_DATA);

  readonly loading = signal(false);
  readonly loadingInvoices = signal(false);
  readonly invoices = signal<SupplierInvoice[]>([]);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup({
    invoiceId: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    appliedAmount: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
  });

  readonly remaining = this.data.remainingAdvance ?? 0;

  constructor() {
    this.loadInvoices();
  }

  private loadInvoices(): void {
    this.loadingInvoices.set(true);
    this.invoiceService.supplierId.set(this.data.supplierId);
    this.invoiceService.status.set('RECONCILED');
    this.invoiceService.reload();

    const check = () => {
      const result = this.invoiceService.facturas.value();
      if (result) {
        this.loadingInvoices.set(false);
        this.invoices.set(result.content ?? []);
      } else if (this.invoiceService.facturas.isLoading()) {
        setTimeout(check, 200);
      } else {
        this.loadingInvoices.set(false);
        this.invoices.set([]);
      }
    };
    check();
  }

  onInvoiceSelected(invoiceId: string): void {
    const invoice = this.invoices().find((inv) => inv.id === invoiceId);
    if (invoice) {
      const max = Math.min(invoice.total, this.remaining);
      this.form.controls.appliedAmount.setValue(max);
    }
  }

  apply(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const request: ApplyAdvanceRequest = {
      advancePaymentId: this.data.id,
      invoiceId: raw.invoiceId,
      appliedAmount: raw.appliedAmount ?? 0,
    };

    if (request.appliedAmount > this.remaining) {
      this.error.set('El monto excede el saldo disponible del anticipo.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.advanceService.apply(request).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.dialogRef.close(result);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Error al aplicar el anticipo.');
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
