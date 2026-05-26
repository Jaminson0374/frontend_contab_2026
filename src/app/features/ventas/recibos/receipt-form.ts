import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { CustomerReceiptService } from '../../../core/services/customer-receipt.service';
import { CxcService } from '../../../core/services/cxc.service';
import { ThirdPartyService } from '../../../core/services/third-party.service';
import type { PaymentMethod } from '../../../core/models/customer-receipt.model';
import type { AccountsReceivable } from '../../../core/models/cxc.model';
import type { ThirdPartySupplierOption } from '../../../core/models/third-party.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-receipt-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './receipt-form.html',
  styles: [
    '.rf-page{max-width:800px;margin:0 auto;padding:1rem} .rf-title{font-size:1.25rem;font-weight:600;margin-bottom:1rem} .rf-form{display:flex;flex-direction:column;gap:1rem} .rf-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem} .rf-section{margin-top:.5rem} .rf-section-title{font-size:1rem;font-weight:500;margin-bottom:.5rem} .rf-ar-table{width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:.5rem} .rf-ar-header{display:grid;grid-template-columns:1fr 1fr 1fr 80px;background:#f8fafc;padding:.5rem 1rem;font-size:.8rem;font-weight:600;color:#475569} .rf-ar-row{display:grid;grid-template-columns:1fr 1fr 1fr 80px;padding:.5rem 1rem;border-top:1px solid #f1f5f9;font-size:.85rem} .rf-ar-row input{width:100%;border:1px solid #e2e8f0;border-radius:4px;padding:4px 8px} .rf-ar-total{text-align:right;padding:.5rem 1rem;font-weight:600;font-size:.9rem;border-top:2px solid #e2e8f0;background:#f8fafc} .rf-error{color:#ef4444;font-size:.875rem} .rf-actions{display:flex;gap:.5rem;justify-content:flex-end}',
  ],
})
export class ReceiptFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly receiptService = inject(CustomerReceiptService);
  readonly cxcService = inject(CxcService);
  readonly thirdPartyService = inject(ThirdPartyService);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadingCxc = signal(false);
  readonly openItems = signal<AccountsReceivable[]>([]);

  readonly clientSearch = signal('');
  readonly clients = this.thirdPartyService.supplierOptions;

  readonly methodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'CASH', label: 'Efectivo' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'CARD', label: 'Tarjeta' },
    { value: 'CHECK', label: 'Cheque' },
  ];

  readonly form = this.fb.nonNullable.group({
    clientId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentDate: [new Date(), Validators.required],
    method: ['CASH' as PaymentMethod, Validators.required],
    reference: [''],
    notes: [''],
  });

  readonly appForm = this.fb.nonNullable.group({});

  readonly appliedTotal = computed(() => {
    let t = 0;
    this.openItems().forEach((_, i) => {
      const v = this.appForm.get(`app_${i}`)?.value;
      if (typeof v === 'number') t += v;
    });
    return t;
  });

  readonly remaining = computed(() => (this.form.controls.amount.value ?? 0) - this.appliedTotal());

  loadOpenItems(clientId: string): void {
    this.loadingCxc.set(true);
    this.cxcService.list(0, 100, clientId, 'OPEN').subscribe({
      next: (page) => {
        const items = page.content.filter(
          (a) => a.status === 'OPEN' || a.status === 'PARTIAL' || a.status === 'OVERDUE',
        );
        this.openItems.set(items);
        items.forEach((_, i) => {
          if (!this.appForm.contains(`app_${i}`)) {
            this.appForm.addControl(`app_${i}`, this.fb.control(0));
          }
        });
        this.loadingCxc.set(false);
      },
      error: () => {
        this.loadingCxc.set(false);
        this.error.set('Error al cargar cuentas por cobrar.');
      },
    });
  }

  onClientSelected(ev: MatAutocompleteSelectedEvent): void {
    this.form.controls.clientId.setValue(ev.option.value);
    this.loadOpenItems(ev.option.value);
  }

  clientLabel(tp: ThirdPartySupplierOption): string {
    return `${tp.name || ''} (${tp.numIdentification})`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const remaining = this.remaining();
    if (Math.abs(remaining) > 0.01) {
      this.error.set(
        `La suma aplicada (${this.appliedTotal().toFixed(2)}) no coincide con el monto del recibo (${v.amount.toFixed(2)}). Diferencia: ${remaining.toFixed(2)}`,
      );
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const applications = this.openItems()
      .map((ar, i) => ({
        arId: ar.id,
        appliedAmount: Number(this.appForm.get(`app_${i}`)?.value) || 0,
      }))
      .filter((a) => a.appliedAmount > 0);

    const date =
      v.paymentDate instanceof Date ? v.paymentDate.toISOString().split('T')[0] : v.paymentDate;

    this.receiptService
      .create({
        clientId: v.clientId,
        amount: v.amount,
        paymentDate: date,
        method: v.method as PaymentMethod,
        reference: v.reference.trim() || undefined,
        notes: v.notes.trim() || undefined,
        applications,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({ icon: 'success', title: 'Recibo creado', confirmButtonColor: '#15803d' });
          this.form.reset({ method: 'CASH' as PaymentMethod, paymentDate: new Date(), amount: 0 });
          this.openItems.set([]);
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al crear el recibo.';
          this.error.set(msg);
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#ef4444' });
        },
      });
  }
}
