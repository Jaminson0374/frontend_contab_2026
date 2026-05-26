import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductionOrderService } from '../../../core/services/production-order.service';
import { ProductSearchComponent } from '../../shared/product-search';
import { WarehousePickerComponent } from '../../shared/warehouse-picker';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    ProductSearchComponent,
    WarehousePickerComponent,
  ],
  templateUrl: './order-form.html',
  styles: [
    '.of-page{max-width:700px;margin:0 auto;padding:1rem} .of-title{font-size:1.25rem;font-weight:600;margin-bottom:1rem} .of-form{display:flex;flex-direction:column;gap:1rem} .of-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem} .of-error{color:#ef4444;font-size:.875rem} .of-actions{display:flex;gap:.5rem;justify-content:flex-end}',
  ],
})
export class OrderFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProductionOrderService);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    formulaId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    plannedDate: [new Date(), Validators.required],
    plannedQuantity: [1, [Validators.required, Validators.min(0.001)]],
    notes: [''],
  });

  onFormulaSelected(evt: { id: string }): void {
    this.form.controls.formulaId.setValue(evt.id);
  }
  onWarehouseSelected(id: string): void {
    this.form.controls.warehouseId.setValue(id);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.service
      .create({
        formulaId: v.formulaId,
        warehouseId: v.warehouseId,
        plannedDate:
          v.plannedDate instanceof Date ? v.plannedDate.toISOString().split('T')[0] : v.plannedDate,
        plannedQuantity: v.plannedQuantity,
        notes: v.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({ icon: 'success', title: 'Orden creada', confirmButtonColor: '#15803d' });
          this.form.reset({ plannedDate: new Date(), plannedQuantity: 1 });
        },
        error: (err: any) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Error al crear la orden.');
        },
      });
  }
}
