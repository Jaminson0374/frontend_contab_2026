import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import Swal from 'sweetalert2';
import { SupplierNoteService } from '../../../core/services/supplier-note.service';
import { ThirdPartyService } from '../../../core/services/third-party.service';
import type { ThirdPartySupplierOption } from '../../../core/models/third-party.model';
import type {
  DebitCreditNoteRequest,
  NoteType,
} from '../../../core/models/debit-credit-note.model';

@Component({
  selector: 'app-nota-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
  ],
  templateUrl: './nota-form.html',
  styleUrl: './nota-form.css',
})
export class NotaFormComponent {
  private readonly noteService = inject(SupplierNoteService);
  readonly thirdPartyService = inject(ThirdPartyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly isEdit = signal(false);
  private readonly editId = signal<string | null>(null);

  // ── Supplier autocomplete ────────────────────────────────────────
  readonly supplierDisplay = new FormControl('', { nonNullable: true });

  readonly suppliers = computed(() => this.thirdPartyService.supplierOptions.value() ?? []);

  // ── Main form ─────────────────────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    type: ['DEBIT_NOTE' as NoteType, [Validators.required]],
    supplierId: ['', [Validators.required]],
    supplierInvoiceId: [null as string | null],
    documentNumber: [''],
    amount: [0 as number, [Validators.required, Validators.min(0.01)]],
    reason: [''],
    reference: [''],
  });

  readonly typeOptions: { value: NoteType; label: string }[] = [
    { value: 'DEBIT_NOTE', label: 'Nota débito' },
    { value: 'CREDIT_NOTE', label: 'Nota crédito' },
  ];

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.loadNote(id);
    }
  }

  private loadNote(id: string): void {
    this.loading.set(true);
    this.noteService.getById(id).subscribe({
      next: (note) => {
        this.form.patchValue({
          type: note.type,
          supplierId: note.supplierId,
          supplierInvoiceId: note.supplierInvoiceId,
          documentNumber: note.documentNumber,
          amount: note.amount,
          reason: note.reason ?? '',
          reference: note.reference ?? '',
        });
        this.syncSupplierDisplay();
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Error al cargar la nota.');
      },
    });
  }

  // ── Supplier ──────────────────────────────────────────────────────
  onSupplierSelected(ev: MatAutocompleteSelectedEvent): void {
    this.form.controls.supplierId.setValue(ev.option.value);
    this.supplierDisplay.setValue(ev.option.viewValue, { emitEvent: false });
  }

  syncSupplierDisplay(): void {
    const id = this.form.controls.supplierId.getRawValue();
    const s = this.suppliers().find((tp) => tp.id === id);
    this.supplierDisplay.setValue(s ? `${s.name} (${s.numIdentification})` : '', {
      emitEvent: false,
    });
  }

  supplierLabel(tp: ThirdPartySupplierOption): string {
    const fullName = [tp.name, tp.lastName].filter(Boolean).join(' ');
    const status = tp.active ? '' : ' — inactivo';
    return `${fullName} (${tp.numIdentification})${status}`;
  }

  // ── Save ──────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const request: DebitCreditNoteRequest = {
      type: raw.type,
      supplierId: raw.supplierId,
      supplierInvoiceId: raw.supplierInvoiceId || null,
      documentNumber: raw.documentNumber || null,
      amount: raw.amount,
      reason: raw.reason || null,
      reference: raw.reference || null,
    };

    this.saving.set(true);
    this.error.set(null);

    if (this.isEdit()) {
      this.noteService.update(this.editId()!, request).subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Nota actualizada',
            confirmButtonColor: '#15803d',
          }).then(() => {
            this.router.navigate(['/compras/notas']);
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al actualizar la nota.';
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
      this.noteService.create(request).subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Nota creada',
            confirmButtonColor: '#15803d',
          }).then(() => {
            this.router.navigate(['/compras/notas']);
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al crear la nota.';
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

  cancel(): void {
    this.router.navigate(['/compras/notas']);
  }
}
