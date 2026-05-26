import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThirdPartyRequest, ThirdPartyBaseType } from '../../../core/models/third-party.model';
import { ThirdPartyService } from '../../../core/services/third-party.service';

type FormMode = 'new' | 'edit';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
})
export class ClientFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ThirdPartyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly mode = signal<FormMode>('new');
  readonly loadedId = signal<string | null>(null);

  readonly isEditing = computed(() => this.mode() === 'new' || this.mode() === 'edit');
  readonly canGuardar = computed(() => this.isEditing() && !this.saving());
  readonly canCancelar = computed(() => this.isEditing());

  readonly pageTitle = computed(() => {
    switch (this.mode()) {
      case 'new':
        return 'Nuevo cliente';
      case 'edit':
        return 'Editando cliente';
      default:
        return 'Cliente';
    }
  });

  readonly form = this.fb.group({
    numIdentification: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    lastName: [''],
    email: ['', Validators.email],
    phone: [''],
    address: [''],
    creditDays: [30],
    creditLimit: [0, [Validators.required, Validators.min(0)]],
  });

  private resetForm(): void {
    this.form.reset({
      creditDays: 30,
      creditLimit: 0,
    });
  }

  private loadIntoForm(data: {
    numIdentification: string;
    name: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    creditDays: number;
    creditLimit: number;
  }): void {
    this.form.patchValue({
      numIdentification: data.numIdentification,
      name: data.name,
      lastName: data.lastName ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      address: data.address ?? '',
      creditDays: data.creditDays,
      creditLimit: data.creditLimit,
    });
  }

  private buildRequest(): ThirdPartyRequest {
    const v = this.form.getRawValue();
    return {
      numIdentification: v.numIdentification!,
      type: 'CLIENT' as ThirdPartyBaseType,
      dv: null,
      identificationTypeId: null,
      thirdPartyCategoryId: null,
      personType: 'JURIDICA',
      name: v.name!,
      lastName: v.lastName || null,
      commonName: null,
      phone: v.phone || null,
      address: v.address || null,
      departmentId: null,
      cityId: null,
      email: v.email || null,
      website: null,
      creditDays: v.creditDays ?? 30,
      creditLimit: v.creditLimit ?? 0,
      priceListId: null,
      entryDate: null,
      contactName: null,
      contactPhone: null,
      contactAddress: null,
      contactEmail: null,
      taxContactFirstName: null,
      taxContactLastName: null,
      taxEmail: null,
      billingPhone: null,
      taxRegime: 'ORDINARIO',
      taxResponsibilities: [],
      isGranContribuyente: false,
      isAutoretenedor: false,
      isAgenteRetencionIva: false,
      isRegimenSimple: false,
      otherTaxResp: false,
      cityCode: null,
      dianClassification: null,
      employeeData: null,
    };
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      this.error.set(null);

      if (!id) {
        this.loadedId.set(null);
        this.resetForm();
        this.mode.set('new');
      } else {
        this.loadedId.set(id);
        this.loading.set(true);
        this.service.getById(id).subscribe({
          next: (data) => {
            this.loading.set(false);
            this.loadIntoForm(data);
            this.mode.set('edit');
          },
          error: () => {
            this.loading.set(false);
            this.error.set('Error al cargar el cliente.');
          },
        });
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        html: 'Hay campos obligatorios sin diligenciar.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ef4444',
      });
      return;
    }

    const request = this.buildRequest();
    this.saving.set(true);
    this.error.set(null);

    const id = this.loadedId();
    const op$ = id ? this.service.update(id, request) : this.service.create(request);

    op$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.service.reload();
        Swal.fire({
          icon: 'success',
          title: '¡Guardado!',
          text: 'Cliente guardado correctamente.',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        this.router.navigate(['..'], { relativeTo: this.route });
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Error al guardar. Intentá de nuevo.';
        this.error.set(msg);
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: msg,
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#ef4444',
        });
      },
    });
  }

  async cancelar(): Promise<void> {
    const isNew = this.mode() === 'new';
    const result = await Swal.fire({
      icon: 'warning',
      title: isNew ? '¿Cancelar creación?' : '¿Cancelar edición?',
      text: isNew ? 'Los datos ingresados se perderán.' : 'Los cambios no guardados se perderán.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Seguir editando',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    this.router.navigate(['..'], { relativeTo: this.route });
  }

  goBack(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
