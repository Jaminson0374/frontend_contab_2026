import { Component, inject, signal, untracked } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CollectionService } from '../../../core/services/collection.service';
import type { CollectionEntry, CollectionStatus } from '../../../core/models/collection.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-collection-list',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
  ],
  templateUrl: './collection-list.html',
  styles: [
    '.cl-page{max-width:1100px;margin:0 auto;padding:1rem} .cl-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem} .cl-title{font-size:1.25rem;font-weight:600} .spinner-container{display:flex;justify-content:center;padding:32px} .error-msg{color:#ef4444;text-align:center} .empty-msg{text-align:center;color:#94a3b8;padding:24px} .cl-table{width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden} .cl-row-clickable{cursor:pointer} .cl-row-clickable:hover{background:#f0f9ff} .chip-pending{background:#fef3c7!important;color:#d97706!important} .chip-contacted{background:#dbeafe!important;color:#2563eb!important} .chip-promised{background:#d1fae5!important;color:#059669!important} .chip-paid{background:#dcfce7!important;color:#16a34a!important} .chip-disputed{background:#fee2e2!important;color:#dc2626!important}',
  ],
})
export class CollectionListComponent {
  readonly service = inject(CollectionService);
  private readonly router = inject(Router);

  readonly cols = [
    'clientName',
    'documentNumber',
    'dueDate',
    'status',
    'lastContact',
    'contactMethod',
    'actions',
  ];

  readonly statusOptions: { value: CollectionStatus | ''; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'CONTACTED', label: 'Contactado' },
    { value: 'PROMISED', label: 'Prometido' },
    { value: 'DISPUTED', label: 'Disputado' },
    { value: 'PAID', label: 'Pagado' },
  ];

  onStatusChange(value: CollectionStatus | ''): void {
    untracked(() => this.service.page.set(0));
    this.service.statusFilter.set(value);
  }

  onPageChange(e: PageEvent): void {
    this.service.page.set(e.pageIndex);
    this.service.pageSize.set(e.pageSize);
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'PENDING':
        return 'Pendiente';
      case 'CONTACTED':
        return 'Contactado';
      case 'PROMISED':
        return 'Prometido';
      case 'PAID':
        return 'Pagado';
      case 'DISPUTED':
        return 'Disputado';
      default:
        return s;
    }
  }

  statusClass(s: string): string {
    return `chip-${s.toLowerCase()}`;
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }

  viewCxc(entry: CollectionEntry): void {
    if (entry.arId) {
      this.router.navigate(['/ventas/cxc'], {
        queryParams: { clientId: entry.clientId },
      });
    }
  }

  logContact(id: string): void {
    Swal.fire({
      title: 'Registrar contacto',
      html:
        '<input id="swal-method" class="swal2-input" placeholder="Método (teléfono, email, visita)">' +
        '<textarea id="swal-notes" class="swal2-textarea" placeholder="Notas del contacto"></textarea>',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const method = (document.getElementById('swal-method') as HTMLInputElement)?.value?.trim();
        const notes = (document.getElementById('swal-notes') as HTMLTextAreaElement)?.value?.trim();
        if (!method) {
          Swal.showValidationMessage('El método es requerido');
          return false;
        }
        return { method, notes };
      },
    }).then((result) => {
      if (!result.isConfirmed) return;
      const { method, notes } = result.value;
      this.service
        .logContact(id, {
          contactMethod: method,
          contactNotes: notes || '',
          newStatus: 'CONTACTED',
        })
        .subscribe(() => this.service.reload());
    });
  }
}
