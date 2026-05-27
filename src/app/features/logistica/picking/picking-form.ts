import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormGroup,
  FormControl,
  FormArray,
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
  requestedQuantity: FormControl<number>;
}>;

@Component({
  selector: 'app-picking-form',
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
  templateUrl: './picking-form.html',
  styleUrl: './picking-form.css',
})
export class PickingFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LogisticsService);
  private readonly router = inject(Router);
  readonly warehouseService = inject(WarehouseService);
  readonly warehouses = this.warehouseService.warehouses;
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    pickingNumber: ['', Validators.required],
    pickingDate: [new Date(), Validators.required],
    warehouseId: ['', Validators.required],
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
        requestedQuantity: [0, [Validators.required, Validators.min(0.01)]],
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
    this.service
      .createPicking({
        pickingNumber: raw.pickingNumber,
        pickingDate: raw.pickingDate.toISOString().split('T')[0],
        warehouseId: raw.warehouseId,
        notes: raw.notes || undefined,
        items: raw.linesArray.map((l) => ({
          productId: l.productId,
          warehouseId: l.warehouseId,
          requestedQuantity: l.requestedQuantity,
        })),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/logistica/picking']);
        },
        error: () => this.saving.set(false),
      });
  }
}
