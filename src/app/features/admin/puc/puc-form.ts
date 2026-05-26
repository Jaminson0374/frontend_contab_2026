import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PucAccountService } from '../../../core/services/puc-account.service';
import { PucAccount } from '../../../core/models/product-catalog.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-puc-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './puc-form.html',
  styleUrl: './puc-form.css',
})
export class PucFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(PucAccountService);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly editId = signal<string | null>(null);
  readonly parentAccounts = signal<PucAccount[]>([]);

  readonly accountClassOptions: ReadonlyArray<{ value: number; label: string }> = [
    { value: 1, label: '1 — Activo' },
    { value: 2, label: '2 — Pasivo' },
    { value: 3, label: '3 — Patrimonio' },
    { value: 4, label: '4 — Ingresos' },
    { value: 5, label: '5 — Gastos' },
    { value: 6, label: '6 — Costos de venta' },
    { value: 7, label: '7 — Costos de producción' },
    { value: 8, label: '8 — Cuentas de orden deudoras' },
    { value: 9, label: '9 — Cuentas de orden acreedoras' },
  ];

  readonly accountNatureOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'DEBITO', label: 'Débito' },
    { value: 'CREDITO', label: 'Crédito' },
  ];

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    level: [1 as number, [Validators.required, Validators.min(1), Validators.max(5)]],
    parentCode: [null as string | null],
    accountClass: [1 as number, [Validators.required, Validators.min(1), Validators.max(9)]],
    accountNature: ['DEBITO' as string, [Validators.required]],
    allowsTransactions: [true],
    active: [true],
  });

  constructor() {
    this.loadParentAccounts();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.loadAccount(id);
    }
  }

  private loadParentAccounts(): void {
    this.service.tree().subscribe({
      next: (accounts) => this.parentAccounts.set(accounts),
      error: () => {},
    });
  }

  private loadAccount(id: string): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (account) => {
        this.form.patchValue({
          code: account.code,
          name: account.name,
          level: account.level,
          parentCode: account.parentCode,
          accountClass: account.accountClass,
          accountNature: account.accountNature,
          allowsTransactions: account.allowsTransactions,
          active: account.active,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar la cuenta PUC.');
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
      code: v.code,
      name: v.name,
      level: v.level,
      parentCode: v.parentCode || null,
      accountClass: v.accountClass,
      accountNature: v.accountNature,
      allowsTransactions: v.allowsTransactions,
    };

    this.saving.set(true);
    this.error.set(null);

    if (this.isEdit()) {
      this.service.update(this.editId()!, body).subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Cuenta actualizada',
            confirmButtonColor: '#15803d',
          }).then(() => {
            this.router.navigate(['/administracion/puc']);
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al actualizar la cuenta.';
          this.error.set(msg);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: msg,
            confirmButtonColor: '#ef4444',
          });
        },
      });
    } else {
      this.service.create(body).subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Cuenta creada',
            confirmButtonColor: '#15803d',
          }).then(() => {
            this.router.navigate(['/administracion/puc']);
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al crear la cuenta.';
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
}
