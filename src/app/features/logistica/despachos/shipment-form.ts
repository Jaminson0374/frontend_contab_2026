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
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { LogisticsService } from '../../../core/services/logistics.service';
import { ProductSearchComponent } from '../../shared/product-search';

type LineForm = FormGroup<{
  productId: FormControl<string>;
  quantity: FormControl<number>;
}>;

@Component({
  selector: 'app-shipment-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    ProductSearchComponent,
  ],
  templateUrl: './shipment-form.html',
  styleUrl: './shipment-form.css',
})
export class ShipmentFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LogisticsService);
  private readonly router = inject(Router);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    shipmentNumber: ['', Validators.required],
    shipmentDate: [new Date(), Validators.required],
    carrierName: [''],
    vehiclePlate: [''],
    driverName: [''],
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
        quantity: [0, [Validators.required, Validators.min(0.01)]],
      }),
    );
  }

  removeLine(index: number): void {
    this.linesArray.removeAt(index);
  }

  onLineProductSelected(index: number, event: { id: string }): void {
    this.linesArray.at(index).controls.productId.setValue(event.id);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.service
      .createShipment({
        shipmentNumber: raw.shipmentNumber,
        shipmentDate: raw.shipmentDate.toISOString().split('T')[0],
        carrierName: raw.carrierName || undefined,
        vehiclePlate: raw.vehiclePlate || undefined,
        driverName: raw.driverName || undefined,
        notes: raw.notes || undefined,
        items: raw.linesArray.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/logistica/despachos']);
        },
        error: () => this.saving.set(false),
      });
  }
}
