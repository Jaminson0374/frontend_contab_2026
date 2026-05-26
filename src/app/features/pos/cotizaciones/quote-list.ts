import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { Router } from '@angular/router';
import { PageResponse } from '../../../core/models/page.model';
import { SalesDocument } from '../../../core/models/sale.model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SaleService } from '../../../core/services/sale.service';

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
  ],
  templateUrl: './quote-list.html',
  styleUrl: './quote-list.css',
})
export class QuoteListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly service = inject(SaleService);

  readonly displayedColumns = [
    'index',
    'documentNumber',
    'type',
    'clientName',
    'status',
    'totalAmount',
    'createdAt',
    'actions',
  ];
  readonly pageSizeOptions = [10, 20, 30];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<PageResponse<SalesDocument> | null>(null);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly typeControl = new FormControl<string>('', { nonNullable: true });
  readonly statusControl = new FormControl<string>('', { nonNullable: true });

  readonly typeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'QUOTE', label: 'Cotización' },
    { value: 'ORDER', label: 'Pedido' },
  ];

  readonly statusOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'DRAFT', label: 'Borrador' },
    { value: 'SENT', label: 'Enviada' },
    { value: 'ACCEPTED', label: 'Aceptada' },
    { value: 'REJECTED', label: 'Rechazada' },
    { value: 'EXPIRED', label: 'Expirada' },
    { value: 'CONFIRMED', label: 'Confirmado' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  filteredRows(): SalesDocument[] {
    const pageData = this.data();
    if (!pageData) {
      return [];
    }
    return pageData.content;
  }

  ngOnInit(): void {
    this.searchControl.setValue(this.service.query(), { emitEvent: false });
    this.loadDocuments();

    this.searchControl.valueChanges
      .pipe(
        startWith(this.searchControl.getRawValue()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.service.query.set(value.trim());
        this.service.page.set(0);
        this.loadDocuments();
      });

    this.typeControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.service.typeFilter.set(value);
      this.service.page.set(0);
      this.loadDocuments();
    });

    this.statusControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.service.statusFilter.set(value);
      this.service.page.set(0);
      this.loadDocuments();
    });
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service
      .search(
        this.service.query(),
        this.service.page(),
        this.service.pageSize(),
        this.service.typeFilter() || undefined,
        this.service.statusFilter() || undefined,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          this.data.set(page);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error cargando documentos. Intentá de nuevo.');
          this.data.set(null);
        },
      });
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'QUOTE':
        return 'Cotización';
      case 'ORDER':
        return 'Pedido';
      case 'INVOICE':
        return 'Factura';
      default:
        return type;
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'Borrador';
      case 'SENT':
        return 'Enviada';
      case 'ACCEPTED':
        return 'Aceptada';
      case 'REJECTED':
        return 'Rechazada';
      case 'EXPIRED':
        return 'Expirada';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'PARTIALLY_INVOICED':
        return 'Parc. facturado';
      case 'INVOICED':
        return 'Facturado';
      case 'ISSUED':
        return 'Emitida';
      case 'PAID':
        return 'Pagada';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'chip-draft';
      case 'SENT':
        return 'chip-sent';
      case 'ACCEPTED':
        return 'chip-accepted';
      case 'REJECTED':
        return 'chip-rejected';
      case 'EXPIRED':
        return 'chip-expired';
      case 'CONFIRMED':
        return 'chip-confirmed';
      case 'CANCELLED':
        return 'chip-cancelled';
      default:
        return 'chip-default';
    }
  }

  openNew(): void {
    this.router.navigate(['/pos/cotizaciones/nuevo']);
  }

  openEdit(id: string): void {
    this.router.navigate(['/pos/cotizaciones', id]);
  }

  onPageChange(ev: PageEvent): void {
    if (ev.pageSize !== this.service.pageSize()) {
      this.service.pageSize.set(ev.pageSize);
      this.service.page.set(0);
    } else {
      this.service.page.set(ev.pageIndex);
    }

    this.loadDocuments();
  }
}
