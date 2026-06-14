import { Component, DestroyRef, inject, signal, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountsPayableService } from '../../../core/services/accounts-payable.service';
import {
  AccountsPayable,
  ApStatus,
  AP_STATUS_LABELS,
  ApAgingResponse,
} from '../../../core/models/accounts-payable.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cxp-list',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './cxp-list.html',
  styleUrl: './cxp-list.css',
})
export class CxpListComponent {
  readonly service = inject(AccountsPayableService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'supplierName',
    'totalAmount',
    'paidAmount',
    'outstanding',
    'dueDate',
    'status',
    'actions',
  ];

  readonly payables = signal<AccountsPayable[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly aging = signal<ApAgingResponse | null>(null);
  readonly agingLoading = signal(false);

  constructor() {
    effect(() => {
      const apList = this.service.payables.value();
      if (apList) {
        this.payables.set(apList);
        this.loading.set(false);
      }
    });
  }

  loadPayables(): void {
    this.loading.set(true);
    this.error.set(null);
  }

  loadAging(): void {
    this.agingLoading.set(true);
    this.service.getAging().subscribe({
      next: (data) => {
        this.aging.set(data);
        this.agingLoading.set(false);
      },
      error: () => {
        this.agingLoading.set(false);
      },
    });
  }

  triggerMarkOverdue(): void {
    Swal.fire({
      title: '¿Marcar como vencidas?',
      text: 'Se actualizarán al estado "Vencido" todas las cuentas por pagar cuya fecha de vencimiento ya pasó.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Marcar vencidas',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f59e0b',
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.markOverdue().subscribe({
          next: (count) => {
            Swal.fire({
              icon: 'success',
              title: `${count} cuenta(s) marcada(s) como vencida(s)`,
              confirmButtonColor: '#15803d',
            });
            this.service.payables.reload();
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo ejecutar el marcado de vencidas.',
              confirmButtonColor: '#ef4444',
            });
          },
        });
      }
    });
  }

  statusLabel(status: ApStatus): string {
    return AP_STATUS_LABELS[status] ?? status;
  }

  statusClass(status: ApStatus): string {
    switch (status) {
      case 'OPEN':
        return 'status-open';
      case 'PARTIAL':
        return 'status-partial';
      case 'OVERDUE':
        return 'status-overdue';
      case 'PAID':
        return 'status-paid';
      default:
        return '';
    }
  }

  isOverdue(payable: AccountsPayable): boolean {
    if (payable.status === 'PAID') return false;
    return new Date(payable.dueDate) < new Date();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }
}
