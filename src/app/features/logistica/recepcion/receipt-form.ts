import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormArray,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { LogisticsService } from '../../../core/services/logistics.service';
import { WarehouseService } from '../../../core/services/warehouse.service';

type LineForm = FormGroup<{
  productId: FormControl<string>;
  warehouseId: FormControl<string>;
  receivedQuantity: FormControl<number>;
  unitCost: FormControl<number>;
}>;

@Component({
  selector: 'app-receipt-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  templateUrl: './receipt-form.html',
  styleUrl: './receipt-form.css',
})
export class ReceiptFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LogisticsService);
  private readonly router = inject(Router);
  readonly warehouseService = inject(WarehouseService);

  readonly saving = signal(false);
  readonly warehouses = computed(() => this.warehouseService.warehouses.value() ?? []);

  readonly form = this.fb.nonNullable.group({
    receiptNumber: ['', Validators.required],
    receiptDate: [new Date(), Validators.required],
    warehouseId: ['', Validators.required],
    supplierId: [''],
    notes: [''],
    linesArray: this.fb.array<LineForm>([]),
  });

  readonly linesArray = this.form.controls.linesArray;

  constructor() {
    this.addLine();
  }

  addLine(): void {
    this.linesArray.push(
      this.fb.nonNullable.group({
        productId: ['', Validators.required],
        warehouseId: ['', Validators.required],
        receivedQuantity: [0, [Validators.required, Validators.min(0.01)]],
        unitCost: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeLine(index: number): void {
    this.linesArray.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const request = {
      receiptNumber: raw.receiptNumber,
      receiptDate: raw.receiptDate.toISOString().split('T')[0],
      warehouseId: raw.warehouseId,
      supplierId: raw.supplierId || undefined,
      notes: raw.notes || undefined,
      items: raw.linesArray.map((line) => ({
        productId: line.productId,
        warehouseId: line.warehouseId,
        receivedQuantity: line.receivedQuantity,
        unitCost: line.unitCost,
      })),
    };

    this.service.createReceipt(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/logistica/recepciones']);
      },
      error: () => this.saving.set(false),
    });
  }
}
