import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom, of, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { ShiftService } from '../../../core/services/shift.service';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { CashRegister } from '../../../core/models/cash-register.model';

@Component({
  selector: 'app-shift-form',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
  ],
  templateUrl: './shift-form.html',
  styleUrl: './shift-form.css',
})
export class ShiftFormComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shiftService = inject(ShiftService);
  private readonly cashRegisterService = inject(CashRegisterService);

  private readonly routeId = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        return of(id);
      }),
    ),
    { initialValue: null },
  );

  readonly mode = signal<'new' | 'view' | 'close'>('new');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly shiftData = signal<{
    id: string;
    cashRegisterName?: string;
    userName?: string;
    openingTime: string;
    closingTime: string | null;
    openingAmount: number;
    closingAmount: number | null;
    status: string;
    cashRegisterId: string;
    userId: string;
  } | null>(null);

  readonly cashRegisters = signal<CashRegister[]>([]);
  readonly filteredRegisters = signal<CashRegister[]>([]);
  readonly cashRegisterControl = new FormControl<string | CashRegister>('', {
    nonNullable: true,
  });

  readonly form = new FormGroup({
    openingAmount: new FormControl<number | null>(null),
    closingAmount: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    const id = this.routeId();
    if (id && id !== 'nuevo') {
      this.mode.set('view');
      this.loadShift(id);

      this.cashRegisterService
        .listActive()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => this.cashRegisters.set(data),
          error: () => this.cashRegisters.set([]),
        });
    } else if (id === 'nuevo') {
      this.mode.set('new');
      this.cashRegisterService
        .listActive()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => this.cashRegisters.set(data),
          error: () => this.cashRegisters.set([]),
        });

      this.cashRegisterControl.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((value) => {
          if (typeof value === 'string') {
            this.filteredRegisters.set(
              value
                ? this.cashRegisters().filter((r) =>
                    r.name.toLowerCase().includes(value.toLowerCase()),
                  )
                : this.cashRegisters(),
            );
          } else {
            this.filteredRegisters.set([]);
          }
        });
    } else {
      // Fallback: redirect to turnos list
      this.router.navigate(['/pos/turnos']);
    }
  }

  private loadShift(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.shiftService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (shift) => {
          this.shiftData.set({
            id: shift.id,
            cashRegisterName: shift.cashRegisterName,
            userName: shift.userName,
            openingTime: shift.openingTime,
            closingTime: shift.closingTime,
            openingAmount: shift.openingAmount,
            closingAmount: shift.closingAmount,
            status: shift.status,
            cashRegisterId: shift.cashRegisterId,
            userId: shift.userId,
          });

          if (shift.status === 'OPEN') {
            this.mode.set('close');
          }

          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error al cargar el turno. Intentá de nuevo.');
        },
      });
  }

  displayFn(cr: CashRegister | string): string {
    if (!cr) return '';
    return typeof cr === 'string' ? cr : `${cr.name}${cr.location ? ' — ' + cr.location : ''}`;
  }

  onRegisterSelected(cr: CashRegister): void {
    this.cashRegisterControl.setValue(cr, { emitEvent: false });
    this.filteredRegisters.set([]);
  }

  async abrirTurno(): Promise<void> {
    const selectedReg = this.cashRegisterControl.value;
    if (!selectedReg || typeof selectedReg === 'string') {
      Swal.fire({
        icon: 'warning',
        title: 'Caja requerida',
        text: 'Seleccioná una caja registradora.',
        confirmButtonColor: '#ef4444',
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Abrir turno?',
      text: `Se abrirá un turno en la caja "${selectedReg.name}". ¿Continuar?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, abrir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#15803d',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    this.saving.set(true);
    const openingAmount = this.form.controls.openingAmount.value ?? undefined;

    try {
      await firstValueFrom(
        this.shiftService.open({
          cashRegisterId: selectedReg.id,
          openingAmount,
        }),
      );

      await Swal.fire({
        icon: 'success',
        title: 'Turno abierto',
        text: 'El turno se abrió correctamente.',
        confirmButtonColor: '#15803d',
      });

      this.router.navigate(['/pos/turnos']);
    } catch (err: any) {
      this.saving.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error al abrir turno',
        text: err?.error?.message ?? 'Error al abrir el turno. Intentá de nuevo.',
        confirmButtonColor: '#ef4444',
      });
    }
  }

  async cerrarTurno(): Promise<void> {
    const shift = this.shiftData();
    if (!shift) return;

    const closingAmount = this.form.controls.closingAmount.value;
    if (closingAmount == null || closingAmount < 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Monto requerido',
        text: 'Ingresá el monto de cierre.',
        confirmButtonColor: '#ef4444',
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Cerrar turno?',
      text: `Se cerrará el turno con un monto de ${new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(closingAmount)}. Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar turno',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    this.saving.set(true);

    try {
      await firstValueFrom(
        this.shiftService.close(shift.id, {
          totalCash: closingAmount,
          totalCard: 0,
          totalTransfer: 0,
          totalCredit: 0,
        }),
      );

      await Swal.fire({
        icon: 'success',
        title: 'Turno cerrado',
        text: 'El turno se cerró correctamente.',
        confirmButtonColor: '#15803d',
      });

      this.router.navigate(['/pos/turnos']);
    } catch (err: any) {
      this.saving.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error al cerrar turno',
        text: err?.error?.message ?? 'Error al cerrar el turno. Intentá de nuevo.',
        confirmButtonColor: '#ef4444',
      });
    }
  }

  volver(): void {
    this.router.navigate(['/pos/turnos']);
  }
}
