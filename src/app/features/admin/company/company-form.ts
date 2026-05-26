import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompanyConfigService } from '../../../core/services/company-config.service';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { Warehouse } from '../../../core/models/warehouse.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-company-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './company-form.html',
  styleUrl: './company-form.css',
})
export class CompanyFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly companyConfigService = inject(CompanyConfigService);
  private readonly warehouseService = inject(WarehouseService);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly dianResolutions = signal<Array<{ id: string; resolutionNumber: string }>>([]);
  readonly certificates = signal<Array<{ id: string; name: string }>>([]);

  readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.maxLength(255)]],
    nit: ['', [Validators.required, Validators.maxLength(20)]],
    address: ['', [Validators.maxLength(255)]],
    phone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    economicActivity: ['', [Validators.maxLength(255)]],
    taxRegime: ['', [Validators.maxLength(100)]],
    currency: ['COP', [Validators.required, Validators.maxLength(3)]],
    mainWarehouseId: ['' as string, []],
    logoUrl: ['', [Validators.maxLength(500)]],
    moratoryInterestRate: [2.5 as number, []],
    interestGraceDays: [0 as number, []],
    interestCompoundFrequency: ['MONTHLY' as string, []],
    costingMethod: ['WEIGHTED_AVERAGE' as string, []],
    overheadAllocationBase: ['MOD' as string, []],
    overheadRate: [0 as number, []],
    dianResolutionId: ['' as string, []],
    softwarePin: ['' as string, []],
    certificateId: ['' as string, []],
  });

  constructor() {
    this.loadWarehouses();
    this.loadConfig();
  }

  private loadWarehouses(): void {
    this.warehouseService.listAll().subscribe({
      next: (warehouses) => this.warehouses.set(warehouses),
      error: () => this.error.set('Error al cargar las bodegas.'),
    });
  }

  private loadConfig(): void {
    this.loading.set(true);
    this.companyConfigService.getConfig().subscribe({
      next: (config) => {
        this.form.patchValue({
          companyName: config.companyName,
          nit: config.nit,
          address: config.address ?? '',
          phone: config.phone ?? '',
          email: config.email ?? '',
          economicActivity: config.economicActivity ?? '',
          taxRegime: config.taxRegime ?? '',
          currency: config.currency,
          mainWarehouseId: config.mainWarehouseId ?? '',
          logoUrl: config.logoUrl ?? '',
          moratoryInterestRate: config.moratoryInterestRate ?? 2.5,
          interestGraceDays: config.interestGraceDays ?? 0,
          interestCompoundFrequency: config.interestCompoundFrequency ?? 'MONTHLY',
          costingMethod: config.costingMethod ?? 'WEIGHTED_AVERAGE',
          overheadAllocationBase: config.overheadAllocationBase ?? 'MOD',
          overheadRate: config.overheadRate ?? 0,
          dianResolutionId: config.dianResolutionId ?? '',
          softwarePin: config.softwarePin ?? '',
          certificateId: config.certificateId ?? '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Error al cargar la configuración de empresa.';
        this.error.set(msg);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const body = {
      companyName: v.companyName,
      nit: v.nit,
      address: v.address || null,
      phone: v.phone || null,
      email: v.email || null,
      economicActivity: v.economicActivity || null,
      taxRegime: v.taxRegime || null,
      currency: v.currency,
      mainWarehouseId: v.mainWarehouseId || null,
      logoUrl: v.logoUrl || null,
      moratoryInterestRate: v.moratoryInterestRate || null,
      interestGraceDays: v.interestGraceDays || null,
      interestCompoundFrequency: v.interestCompoundFrequency || null,
      costingMethod: v.costingMethod || null,
      overheadAllocationBase: v.overheadAllocationBase || null,
      overheadRate: v.overheadRate || null,
      dianResolutionId: v.dianResolutionId || null,
      softwarePin: v.softwarePin || null,
      certificateId: v.certificateId || null,
    };

    this.saving.set(true);
    this.error.set(null);

    this.companyConfigService.saveConfig(body).subscribe({
      next: () => {
        this.saving.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Configuración guardada',
          text: 'La configuración de la empresa ha sido actualizada.',
          confirmButtonColor: '#15803d',
        });
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Error al guardar la configuración.';
        this.error.set(msg);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          confirmButtonColor: '#ef4444',
        });
      },
    });
  }
}
