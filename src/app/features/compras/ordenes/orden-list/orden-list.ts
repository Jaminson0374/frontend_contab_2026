import { Component, DestroyRef, inject, OnInit, untracked } from '@angular/core';
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
import { DatePipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import type { PurchaseOrderStatus } from '../../../../core/models/purchase-order.model';

@Component({
  selector: 'app-orden-list',
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
  ],
  templateUrl: './orden-list.html',
  styleUrl: './orden-list.css',
})
export class OrdenListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly service = inject(PurchaseOrderService);

  readonly displayedColumns = [
    'index',
    'documentNumber',
    'orderDate',
    'supplierName',
    'status',
    'totalLines',
    'actions',
  ];
  readonly pageSizeOptions = [10, 20, 30];
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly statusOptions: { value: PurchaseOrderStatus | null; label: string }[] = [
    { value: null, label: 'Todos' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'PARTIAL', label: 'Parcial' },
    { value: 'RECEIVED', label: 'Recibido' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  readonly statusLabels: Record<PurchaseOrderStatus, string> = {
    PENDING: 'Pendiente',
    PARTIAL: 'Parcial',
    RECEIVED: 'Recibido',
    CANCELLED: 'Cancelado',
  };

  ngOnInit(): void {
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

  onStatusChange(value: PurchaseOrderStatus | null): void {
    untracked(() => this.service.page.set(0));
    this.service.status.set(value);
  }

  openNew(): void {
    this.router.navigate(['nuevo'], { relativeTo: this.route });
  }

  openEdit(id: string): void {
    this.router.navigate([id], { relativeTo: this.route });
  }

  cancelOrder(id: string): void {
    if (!confirm('¿Cancelar esta orden de compra? Esta acción no se puede deshacer.')) return;
    this.service.cancel(id).subscribe(() => this.service.reload());
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as PurchaseOrderStatus] ?? status;
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
