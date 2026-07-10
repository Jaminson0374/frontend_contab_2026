import { Component, computed, DestroyRef, inject, OnInit, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { SupplierInvoiceService } from '../../../../core/services/supplier-invoice.service';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import type {
  InvoiceStatus,
  SupplierInvoice,
} from '../../../../core/models/supplier-invoice.model';

@Component({
  selector: 'app-factura-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    DatePipe,
    CurrencyPipe,
  ],
  templateUrl: './factura-list.html',
  styleUrl: './factura-list.css',
})
export class FacturaListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly service = inject(SupplierInvoiceService);
  private readonly thirdPartyService = inject(ThirdPartyService);

  readonly displayedColumns = [
    'invoiceNumber',
    'supplierName',
    'issueDate',
    'total',
    'status',
    'actions',
  ];
  readonly pageSizeOptions = [10, 20, 30];
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly statusOptions: { value: InvoiceStatus | null; label: string }[] = [
    { value: null, label: 'Todos' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'RECONCILED', label: 'Conciliada' },
    { value: 'PAID', label: 'Pagada' },
    { value: 'DISPUTED', label: 'Disputada' },
  ];

  readonly statusLabels: Record<InvoiceStatus, string> = {
    PENDING: 'Pendiente',
    RECONCILED: 'Conciliada',
    PAID: 'Pagada',
    DISPUTED: 'Disputada',
  };

  readonly availableSuppliers = computed(() => {
    const data = this.service.facturas.value();
    if (!data) return [];
    const seen = new Set<string>();
    const unique: { id: string; name: string }[] = [];
    for (const row of data.content) {
      if (row.supplierId && !seen.has(row.supplierId)) {
        seen.add(row.supplierId);
        unique.push({ id: row.supplierId, name: row.supplierName });
      }
    }
    return unique.sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnInit(): void {
    this.service.reload();

    this.searchControl.valueChanges
      .pipe(
        startWith(this.searchControl.getRawValue()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        untracked(() => this.service.page.set(0));
        this.service.query.set(value.trim());
      });
  }

  onStatusChange(value: InvoiceStatus | null): void {
    untracked(() => this.service.page.set(0));
    this.service.status.set(value);
  }

  onSupplierFilter(value: string | null): void {
    untracked(() => this.service.page.set(0));
    this.service.supplierId.set(value || null);
  }

  openNew(): void {
    this.router.navigate(['nueva'], { relativeTo: this.route });
  }

  reconcileInvoice(id: string): void {
    this.service.reconcile(id).subscribe(() => this.service.reload());
  }

  disputeInvoice(id: string): void {
    const reason = prompt('Motivo de la disputa (opcional):');
    if (reason === null) return;
    this.service.dispute(id, reason || undefined).subscribe(() => this.service.reload());
  }

  payInvoice(invoice: SupplierInvoice): void {
    this.router.navigate(['/compras/pagos/nuevo'], {
      queryParams: { supplierId: invoice.supplierId },
    });
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as InvoiceStatus] ?? status;
  }

  getStatusClass(status: string): string {
    return `chip-status-${status.toLowerCase()}`;
  }

  onPageChange(ev: PageEvent): void {
    if (ev.pageSize !== this.service.pageSize()) {
      this.service.pageSize.set(ev.pageSize);
      this.service.page.set(0);
    } else {
      this.service.page.set(ev.pageIndex);
    }
  }
}
