import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CurrencyPipe, formatDate } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ShiftService } from '../../../core/services/shift.service';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import type { Shift, CashCountRequest } from '../../../core/models/shift.model';

@Component({
  selector: 'app-cash-closing',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './cash-closing.html',
  styleUrl: './cash-closing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashClosingComponent {
  private readonly router = inject(Router);
  private readonly shiftService = inject(ShiftService);
  private readonly cashRegisterService = inject(CashRegisterService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeShift = signal<Shift | null>(null);
  readonly result = signal<{
    expectedTotal: number;
    actualTotal: number;
    difference: number;
    invoiceCount: number;
    zReportUrl: string | null;
  } | null>(null);

  readonly form = new FormGroup({
    totalCash: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    totalCard: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    totalTransfer: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    totalCredit: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    notes: new FormControl<string>('', { nonNullable: true }),
  });

  readonly actualTotal = computed(() => {
    const f = this.form.getRawValue();
    return (f.totalCash ?? 0) + (f.totalCard ?? 0) + (f.totalTransfer ?? 0) + (f.totalCredit ?? 0);
  });

  readonly expectedTotal = computed(() => {
    const r = this.result();
    return r?.expectedTotal ?? this.activeShift()?.closingAmount ?? 0;
  });

  readonly difference = computed(() => this.actualTotal() - this.expectedTotal());

  readonly differenceClass = computed(() => {
    const d = this.difference();
    if (d === 0) return 'diff-zero';
    if (d < 0) return 'diff-negative';
    return 'diff-positive';
  });

  readonly showResult = computed(() => this.result() !== null);

  constructor() {
    this.loadActiveShift();
  }

  private loadActiveShift(): void {
    this.loading.set(true);
    this.error.set(null);

    this.cashRegisterService.listActive().subscribe({
      next: (registers) => {
        if (registers.length === 0) {
          this.loading.set(false);
          this.error.set('No hay cajas registradoras activas.');
          return;
        }

        // Try each active cash register until we find one with an open shift
        this.tryLoadShift(registers, 0);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar cajas registradoras.');
      },
    });
  }

  private tryLoadShift(registers: { id: string }[], index: number): void {
    if (index >= registers.length) {
      this.loading.set(false);
      // No active shift found on any register
      return;
    }

    this.shiftService.getActive(registers[index].id).subscribe({
      next: (shift) => {
        this.activeShift.set(shift);
        this.loading.set(false);
      },
      error: () => {
        // Try next cash register
        this.tryLoadShift(registers, index + 1);
      },
    });
  }

  async cerrarCaja(): Promise<void> {
    const shift = this.activeShift();
    if (!shift) return;

    if (!this.form.valid) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Completá todos los campos de conteo.',
        confirmButtonColor: '#ef4444',
      });
      return;
    }

    const raw = this.form.getRawValue();
    const actual = this.actualTotal();

    // Look up expected total from Z-report or shift
    const shiftLabel = shift.id.substring(0, 8).toUpperCase();

    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Cerrar caja?',
      html: `
        <p style="text-align:left;">
          Turno: <strong>#${shiftLabel}</strong><br>
          Total contado: <strong>${this.formatCurrency(actual)}</strong><br><br>
          Esta acción no se puede deshacer.
        </p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar caja',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    this.saving.set(true);

    const cashCount: CashCountRequest = {
      totalCash: raw.totalCash ?? 0,
      totalCard: raw.totalCard ?? 0,
      totalTransfer: raw.totalTransfer ?? 0,
      totalCredit: raw.totalCredit ?? 0,
      notes: raw.notes || undefined,
    };

    try {
      const closedShift = await firstValueFrom(this.shiftService.close(shift.id, cashCount));

      this.result.set({
        expectedTotal: 0, // Will be extracted from Z-Report or backend
        actualTotal: actual,
        difference: 0,
        invoiceCount: 0,
        zReportUrl: closedShift.zReportUrl,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Caja cerrada',
        html: `
          <p>El turno se cerró correctamente.</p>
          <p>Total contado: <strong>${this.formatCurrency(actual)}</strong></p>
        `,
        confirmButtonColor: '#15803d',
      });

      this.saving.set(false);
    } catch (err: unknown) {
      this.saving.set(false);
      const message =
        err && typeof err === 'object' && 'error' in err
          ? (err as { error?: { message?: string } }).error?.message
          : 'Error al cerrar la caja. Intentá de nuevo.';
      Swal.fire({
        icon: 'error',
        title: 'Error al cerrar caja',
        text: message ?? 'Error desconocido.',
        confirmButtonColor: '#ef4444',
      });
    }
  }

  downloadZReport(): void {
    const shift = this.activeShift();
    if (!shift) return;

    this.shiftService.getZReport(shift.id).subscribe({
      next: (content) => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `z-report-turno-${shift.id.substring(0, 8)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo descargar el reporte Z.',
          confirmButtonColor: '#ef4444',
        });
      },
    });
  }

  volver(): void {
    this.router.navigate(['/pos/turnos']);
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatShiftTime(time: string): string {
    return formatDate(time, 'medium', 'es-CO');
  }
}
