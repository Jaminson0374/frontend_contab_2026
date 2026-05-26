import { Component, inject, computed } from '@angular/core';
import { CurrencyPipe, DatePipe, SlicePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';
import { SupplierNoteService } from '../../../core/services/supplier-note.service';
import { ThirdPartyService } from '../../../core/services/third-party.service';
import type { DebitCreditNote, NoteType } from '../../../core/models/debit-credit-note.model';
import type { ThirdPartySupplierOption } from '../../../core/models/third-party.model';

@Component({
  selector: 'app-nota-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    SlicePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatCardModule,
    MatButtonModule,
  ],
  templateUrl: './nota-list.html',
  styleUrl: './nota-list.css',
})
export class NotaListComponent {
  readonly service = inject(SupplierNoteService);
  readonly thirdPartyService = inject(ThirdPartyService);
  private readonly router = inject(Router);

  readonly displayedColumns = [
    'type',
    'documentNumber',
    'supplierName',
    'amount',
    'reason',
    'reference',
    'createdAt',
    'actions',
  ];

  readonly pageSizeOptions = [10, 20, 30];

  readonly suppliers = computed(() => this.thirdPartyService.supplierOptions.value() ?? []);

  readonly noteData = computed(() => this.service.notes.value());

  readonly typeFilter = new FormControl<NoteType | 'ALL'>('ALL', { nonNullable: true });

  readonly typeOptions: { value: NoteType | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Todos' },
    { value: 'DEBIT_NOTE', label: 'Nota débito' },
    { value: 'CREDIT_NOTE', label: 'Nota crédito' },
  ];

  onTypeChange(value: NoteType | 'ALL'): void {
    this.service.type.set(value === 'ALL' ? null : value);
    this.service.page.set(0);
    this.service.reload();
  }

  onSupplierChange(id: string | null): void {
    this.service.supplierId.set(id);
    this.service.page.set(0);
    this.service.reload();
  }

  onPageChange(event: PageEvent): void {
    this.service.page.set(event.pageIndex);
    this.service.size.set(event.pageSize);
  }

  typeLabel(type: NoteType): string {
    return type === 'DEBIT_NOTE' ? 'Débito' : 'Crédito';
  }

  typeChipClass(type: NoteType): string {
    return type === 'DEBIT_NOTE' ? 'chip-debit' : 'chip-credit';
  }

  openNewNote(): void {
    this.router.navigate(['/compras/notas/nuevo']);
  }

  editNote(note: DebitCreditNote): void {
    this.router.navigate(['/compras/notas', note.id]);
  }

  deleteNote(note: DebitCreditNote): void {
    Swal.fire({
      title: '¿Eliminar nota?',
      text: `Se eliminará la nota ${note.documentNumber} y se revertirá su efecto en el saldo del proveedor.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.service.delete(note.id).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Nota eliminada',
            confirmButtonColor: '#15803d',
          });
          this.service.reload();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message ?? 'Error al eliminar la nota.',
            confirmButtonColor: '#ef4444',
          });
        },
      });
    });
  }
}
