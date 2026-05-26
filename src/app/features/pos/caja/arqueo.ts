import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { ShiftService } from '../../../core/services/shift.service';
import { CashRegister } from '../../../core/models/cash-register.model';
import { Shift } from '../../../core/models/shift.model';

interface Denomination {
  value: number;
  label: string;
  type: 'bill' | 'coin';
}

@Component({
  selector: 'app-arqueo',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './arqueo.html',
  styleUrl: './arqueo.css',
})
export class ArqueoComponent implements OnInit {
  private readonly cashRegisterService = inject(CashRegisterService);
  private readonly shiftService = inject(ShiftService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly shiftLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly cashRegisters = signal<CashRegister[]>([]);
  readonly selectedRegisterId = new FormControl<string>('', { nonNullable: true });

  readonly activeShift = signal<Shift | null>(null);

  readonly denominations: Denomination[] = [
    { value: 100000, label: '$100,000', type: 'bill' },
    { value: 50000, label: '$50,000', type: 'bill' },
    { value: 20000, label: '$20,000', type: 'bill' },
    { value: 10000, label: '$10,000', type: 'bill' },
    { value: 5000, label: '$5,000', type: 'bill' },
    { value: 2000, label: '$2,000', type: 'bill' },
    { value: 1000, label: '$1,000', type: 'bill' },
    { value: 1000, label: '$1,000', type: 'coin' },
    { value: 500, label: '$500', type: 'coin' },
    { value: 200, label: '$200', type: 'coin' },
    { value: 100, label: '$100', type: 'coin' },
    { value: 50, label: '$50', type: 'coin' },
  ];

  readonly countControls: FormControl<number | null>[] = this.denominations.map(
    () => new FormControl<number | null>(null),
  );

  readonly countedByDenomination = computed(() =>
    this.countControls.map((ctrl, i) => {
      const qty = ctrl.value ?? 0;
      return { denom: this.denominations[i], qty, subtotal: qty * this.denominations[i].value };
    }),
  );

  readonly totalCounted = computed(() =>
    this.countedByDenomination().reduce((sum, d) => sum + d.subtotal, 0),
  );

  readonly expectedCash = computed(() => {
    const shift = this.activeShift();
    if (!shift) return 0;
    return shift.openingAmount;
  });

  readonly difference = computed(() => this.totalCounted() - this.expectedCash());

  ngOnInit(): void {
    this.cashRegisterService
      .listActive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (registers: CashRegister[]) => {
          this.cashRegisters.set(registers);
          if (registers.length > 0) {
            this.selectedRegisterId.setValue(registers[0].id);
            this.loadShift(registers[0].id);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error al cargar las cajas registradoras.');
        },
      });

    this.selectedRegisterId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        if (id) {
          this.loadShift(id);
        }
      });
  }

  private loadShift(cashRegisterId: string): void {
    this.shiftLoading.set(true);
    this.activeShift.set(null);

    this.shiftService
      .getActive(cashRegisterId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (shift: Shift) => {
          this.activeShift.set(shift);
          this.shiftLoading.set(false);
        },
        error: () => {
          this.activeShift.set(null);
          this.shiftLoading.set(false);
        },
      });
  }

  resetCounts(): void {
    this.countControls.forEach((c) => c.setValue(null));
  }

  fillExample(): void {
    const expected = this.expectedCash();
    if (expected <= 0) return;

    this.resetCounts();
    let remaining = expected;

    for (let i = 0; i < this.denominations.length && remaining > 0; i++) {
      const denom = this.denominations[i];
      const qty = Math.floor(remaining / denom.value);
      if (qty > 0) {
        this.countControls[i].setValue(qty);
        remaining -= qty * denom.value;
      }
    }
  }
}
