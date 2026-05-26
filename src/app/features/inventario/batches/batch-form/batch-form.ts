import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { BatchService } from '../../../../core/services/batch.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';

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
  ],
  templateUrl: './batch-form.html',
})
export class BatchFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly batchService = inject(BatchService);
  readonly warehouseService = inject(WarehouseService);
  readonly thirdPartyService = inject(ThirdPartyService);
  private readonly ref = inject(MatDialogRef<BatchFormComponent>);

  readonly saving = signal(false);

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
    entryDate: [new Date(), Validators.required],
    initialWeight: [0, [Validators.required, Validators.min(0.001)]],
    purchaseCost: [0, [Validators.required, Validators.min(0)]],
    notes: [''],
  });

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const date =
      raw.entryDate instanceof Date ? raw.entryDate.toISOString().split('T')[0] : raw.entryDate;

    const request = {
      supplierId: raw.supplierId,
      warehouseId: raw.warehouseId,
      entryDate: date,
      initialWeight: raw.initialWeight,
      purchaseCost: raw.purchaseCost,
      notes: raw.notes || null,
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
}
