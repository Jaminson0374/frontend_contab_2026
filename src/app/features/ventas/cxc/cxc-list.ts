import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CurrencyPipe, DatePipe, SlicePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { CxcService } from '../../../core/services/cxc.service';
import {
  AccountsReceivable,
  ArStatus,
  ArAgingResponse,
  AgingBucket,
} from '../../../core/models/cxc.model';
import { PageResponse } from '../../../core/models/page.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cxc-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    SlicePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatCardModule,
  ],
  templateUrl: './cxc-list.html',
  styleUrl: './cxc-list.css',
})
export class CxcListComponent implements OnInit {
  readonly service = inject(CxcService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<PageResponse<AccountsReceivable> | null>(null);
  readonly aging = signal<ArAgingResponse | null>(null);
  readonly calculatingInterest = signal(false);

  readonly displayedColumns = [
    'documentNumber',
    'clientName',
    'totalAmount',
    'paidAmount',
    'outstanding',
    'intereses',
    'dueDate',
    'status',
    'actions',
  ];

  readonly pageSizeOptions = [10, 20, 30];
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly statusOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: '', label: 'Todos' },
    { value: 'OPEN', label: 'Abiertas' },
    { value: 'PARTIAL', label: 'Parciales' },
    { value: 'OVERDUE', label: 'Vencidas' },
    { value: 'PAID', label: 'Pagadas' },
  ];

  readonly agingBuckets = computed<{ label: string; color: string; bucket: AgingBucket }[]>(() => {
    const a = this.aging();
    if (!a) return [];
    return [
      { label: 'Al día', color: '#22c55e', bucket: a.current },
      { label: '1-30 días', color: '#eab308', bucket: a.days1to30 },
      { label: '31-60 días', color: '#f97316', bucket: a.days31to60 },
      { label: '61-90 días', color: '#ef4444', bucket: a.days61to90 },
      { label: '90+ días', color: '#991b1b', bucket: a.days91Plus },
    ];
  });

  ngOnInit(): void {
    this.loadData();
    this.loadAging();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.service.searchQuery.set(value.trim());
        this.service.page.set(0);
      });
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const currentStatus = this.service.statusFilter();
    this.service
      .list(
        this.service.page(),
        this.service.pageSize(),
        this.service.clientIdFilter() || undefined,
        currentStatus || undefined,
      )
      .subscribe({
        next: (page) => {
          this.data.set(page);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error al cargar las cuentas por cobrar.');
        },
      });
  }

  loadAging(): void {
    this.service.getAging().subscribe({
      next: (agingData) => this.aging.set(agingData),
      error: () => console.warn('No se pudo cargar el aging'),
    });
  }

  onStatusChange(): void {
    this.service.page.set(0);
    this.loadData();
  }

  onPageChange(event: PageEvent): void {
    this.service.page.set(event.pageIndex);
    this.service.pageSize.set(event.pageSize);
    this.loadData();
  }

  statusLabel(status: ArStatus): string {
    switch (status) {
      case 'OPEN':
        return 'Abierta';
      case 'PARTIAL':
        return 'Parcial';
      case 'PAID':
        return 'Pagada';
      case 'OVERDUE':
        return 'Vencida';
      default:
        return status;
    }
  }

  statusClass(status: ArStatus): string {
    switch (status) {
      case 'OPEN':
        return 'chip-open';
      case 'PARTIAL':
        return 'chip-partial';
      case 'OVERDUE':
        return 'chip-overdue';
      case 'PAID':
        return 'chip-paid';
      default:
        return '';
    }
  }

  totalOutstanding(): number {
    const a = this.aging();
    return a ? a.totalOutstanding : 0;
  }

  async calculateInterest(): Promise<void> {
    const result = await Swal.fire({
      title: '¿Calcular intereses?',
      text: 'Se calcularán intereses de mora sobre todas las cuentas vencidas',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Calcular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f59e0b',
    });
    if (!result.isConfirmed) return;

    this.calculatingInterest.set(true);
    try {
      const response = await firstValueFrom(this.service.calculateInterest());
      await Swal.fire({
        icon: 'success',
        title: 'Intereses calculados',
        html: `<b>${response.processedCount}</b> cuentas procesadas<br>
               <b>${response.skippedCount}</b> omitidas (mismo día o en gracia)<br>
               Total acumulado: <b>${this.formatCurrency(response.totalInterestAccrued)}</b>`,
        confirmButtonColor: '#15803d',
      });
      this.loadData();
    } catch (e: unknown) {
      const err = e as { error?: { message?: string } };
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.error?.message || 'Error al calcular intereses',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      this.calculatingInterest.set(false);
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  openDocument(ar: AccountsReceivable): void {
    if (ar.documentId) {
      this.router.navigate(['/ventas/documentos', ar.documentId]);
    }
  }

  createReceipt(ar: AccountsReceivable): void {
    this.router.navigate(['/ventas/recibos/nuevo'], {
      queryParams: { clientId: ar.clientId },
    });
  }
}
