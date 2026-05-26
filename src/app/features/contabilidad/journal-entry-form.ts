import { Component, inject, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { JournalEntryService } from '../../core/services/journal-entry.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-journal-entry-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  template: `
    <mat-card class="je-form">
      <mat-card-header>
        <mat-card-title>Nuevo asiento contable</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" class="flex flex-col gap-3 pt-4">
          <mat-form-field appearance="outline">
            <mat-label>Fecha</mat-label>
            <input matInput [matDatepicker]="dp" formControlName="entryDate" />
            <mat-datepicker-toggle matSuffix [for]="dp" />
            <mat-datepicker #dp />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Descripción</mat-label>
            <textarea matInput formControlName="description" rows="2"></textarea>
          </mat-form-field>
          <h4 class="text-sm font-semibold">Líneas del asiento</h4>
          @for (line of lines.controls; track i; let i = $index) {
            <div class="flex gap-2 items-start" [formGroup]="lineGroup(i)">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Cuenta ID</mat-label>
                <input matInput formControlName="accountId" placeholder="UUID de la cuenta PUC" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-28">
                <mat-label>Débito</mat-label>
                <input matInput type="number" formControlName="debit" step="0.01" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-28">
                <mat-label>Crédito</mat-label>
                <input matInput type="number" formControlName="credit" step="0.01" />
              </mat-form-field>
              <button
                mat-icon-button
                color="warn"
                type="button"
                (click)="removeLine(i)"
                [disabled]="lines.length === 2"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }
          <button mat-stroked-button type="button" (click)="addLine()">
            <mat-icon>add</mat-icon> Agregar línea
          </button>
        </form>
      </mat-card-content>
      <mat-card-actions align="end">
        <button mat-button (click)="cancel.emit()">Cancelar</button>
        <button
          mat-raised-button
          color="primary"
          (click)="submit()"
          [disabled]="form.invalid || saving()"
        >
          @if (saving()) {
            <mat-spinner diameter="16" style="display:inline-block;margin-right:4px" />
          }
          Guardar
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    '.je-form{max-width:700px;margin:0 auto}',
    '.flex{display:flex}',
    '.flex-col{flex-direction:column}',
    '.flex-1{flex:1}',
    '.gap-2{gap:.5rem}',
    '.gap-3{gap:.75rem}',
    '.items-start{align-items:flex-start}',
    '.pt-4{padding-top:1rem}',
    '.w-28{width:7rem}',
    '.text-sm{font-size:.875rem}',
    '.font-semibold{font-weight:600}',
  ],
})
export class JournalEntryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(JournalEntryService);
  readonly cancel = output<void>();
  readonly saved = output<void>();
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    entryDate: [new Date(), Validators.required],
    description: [''],
  });

  readonly lines = this.fb.nonNullable.array([this.createLineGroup(), this.createLineGroup()]);

  private createLineGroup() {
    return this.fb.nonNullable.group({
      accountId: ['', Validators.required],
      debit: [0, [Validators.min(0)]],
      credit: [0, [Validators.min(0)]],
    });
  }

  lineGroup(i: number) {
    return this.lines.at(i) as ReturnType<typeof this.createLineGroup>;
  }

  addLine(): void {
    this.lines.push(this.createLineGroup());
  }

  removeLine(i: number): void {
    this.lines.removeAt(i);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      entryDate: v.entryDate.toISOString().split('T')[0],
      description: v.description,
      lines: this.lines.getRawValue().map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
      })),
    };

    this.saving.set(true);
    this.service.create(body).subscribe({
      next: () => {
        this.saving.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Asiento creado',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message ?? 'No se pudo crear el asiento.',
        });
      },
    });
  }
}
