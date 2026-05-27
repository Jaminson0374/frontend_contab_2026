import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { LogisticsService } from '../../../core/services/logistics.service';

@Component({
  selector: 'app-guide-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './guide-form.html',
  styleUrl: './guide-form.css',
})
export class GuideFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LogisticsService);
  private readonly router = inject(Router);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    guideNumber: ['', Validators.required],
    issueDate: [new Date(), Validators.required],
    vehiclePlate: [''],
    driverName: [''],
    driverId: [''],
    originAddress: [''],
    destinationAddress: [''],
    carrierName: [''],
    estimatedDelivery: [null as Date | null],
    notes: [''],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.service
      .createGuide({
        guideNumber: raw.guideNumber,
        issueDate: raw.issueDate.toISOString().split('T')[0],
        vehiclePlate: raw.vehiclePlate || undefined,
        driverName: raw.driverName || undefined,
        driverId: raw.driverId || undefined,
        originAddress: raw.originAddress || undefined,
        destinationAddress: raw.destinationAddress || undefined,
        carrierName: raw.carrierName || undefined,
        estimatedDelivery: raw.estimatedDelivery?.toISOString().split('T')[0],
        notes: raw.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/logistica/guias']);
        },
        error: () => this.saving.set(false),
      });
  }
}
