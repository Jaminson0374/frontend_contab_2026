import { Component, DestroyRef, inject, signal, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { AuditLog } from '../../../core/models/audit-log.model';

@Component({
  selector: 'app-audit-log-list',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './audit-log-list.html',
  styleUrl: './audit-log-list.css',
})
export class AuditLogListComponent {
  readonly service = inject(AuditLogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'entityType',
    'entityId',
    'action',
    'fieldName',
    'userId',
    'ipAddress',
    'createdAt',
  ];

  readonly pageSizeOptions = [10, 20, 50];

  // Filter form controls
  readonly entityTypeControl = new FormControl('', { nonNullable: true });
  readonly userIdControl = new FormControl('', { nonNullable: true });
  readonly actionControl = new FormControl('', { nonNullable: true });
  readonly fromDateControl = new FormControl<Date | null>(null);
  readonly toDateControl = new FormControl<Date | null>(null);

  readonly entityTypeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: '', label: 'Todas las entidades' },
    { value: 'PRODUCT', label: 'Producto' },
    { value: 'SALES_DOCUMENT', label: 'Documento de venta' },
    { value: 'PURCHASE_ORDER', label: 'Orden de compra' },
    { value: 'ADJUSTMENT', label: 'Ajuste' },
    { value: 'USER', label: 'Usuario' },
    { value: 'CUSTOM_PRICE', label: 'Precio personalizado' },
    { value: 'COMPANY_CONFIG', label: 'Config. empresa' },
    { value: 'THIRD_PARTY', label: 'Tercero' },
  ];

  readonly actionOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: '', label: 'Todas las acciones' },
    { value: 'CREATE', label: 'CREATE' },
    { value: 'UPDATE', label: 'UPDATE' },
    { value: 'DELETE', label: 'DELETE' },
  ];

  constructor() {
    // Apply all filters together via untracked in the service
    effect(() => {
      // Read all signals to register dependencies — applyFilter batches them
      this.applyFilters();
    });
  }

  private applyFilters(): void {
    const from = this.fromDateControl.value;
    const to = this.toDateControl.value;

    this.service.setFilter(
      this.entityTypeControl.value || null,
      this.userIdControl.value || null,
      this.actionControl.value || null,
      from ? from.toISOString() : null,
      to ? this.endOfDay(to) : null,
    );
  }

  private endOfDay(date: Date): string {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }

  onFilterChange(): void {
    this.service.page.set(0);
    this.applyFilters();
  }

  clearFilters(): void {
    this.entityTypeControl.reset('');
    this.userIdControl.reset('');
    this.actionControl.reset('');
    this.fromDateControl.reset();
    this.toDateControl.reset();
    this.service.page.set(0);
    this.applyFilters();
  }

  onPageChange(event: PageEvent): void {
    this.service.page.set(event.pageIndex);
    this.service.size.set(event.pageSize);
  }

  truncateId(id: string | null): string {
    if (!id) return '-';
    return id.substring(0, 8) + '...';
  }

  actionChipClass(action: string): string {
    switch (action) {
      case 'CREATE':
        return 'al-chip-create';
      case 'UPDATE':
        return 'al-chip-update';
      case 'DELETE':
        return 'al-chip-delete';
      default:
        return '';
    }
  }

  actionLabel(action: string): string {
    switch (action) {
      case 'CREATE':
        return 'Creación';
      case 'UPDATE':
        return 'Actualización';
      case 'DELETE':
        return 'Eliminación';
      default:
        return action;
    }
  }
}
