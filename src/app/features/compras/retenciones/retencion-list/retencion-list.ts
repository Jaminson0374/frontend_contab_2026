import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { CurrencyPipe } from '@angular/common';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { PageResponse } from '../../../../core/models/page.model';
import type { ThirdPartySupplierOption } from '../../../../core/models/third-party.model';

export interface RetencionEntry {
  supplierId: string;
  supplierName: string;
  invoiceCount: number;
  retentionTotal: number;
}

@Component({
  selector: 'app-retencion-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    CurrencyPipe,
  ],
  templateUrl: './retencion-list.html',
  styleUrl: './retencion-list.css',
})
export class RetencionListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly thirdPartyService = inject(ThirdPartyService);

  readonly loading = signal(false);
  readonly data = signal<PageResponse<RetencionEntry> | null>(null);
  readonly error = signal<string | null>(null);

  readonly supplierDisplay = new FormControl('', { nonNullable: true });

  readonly filterForm = new FormGroup({
    supplierId: new FormControl<string>(''),
    period: new FormControl<string>(''),
  });

  readonly displayedColumns = ['supplierName', 'invoiceCount', 'retentionTotal'];
  readonly pageSizeOptions = [10, 20, 30];
  readonly page = signal(0);
  readonly pageSize = signal(20);

  ngOnInit(): void {
    this.loadData();
  }

  onSupplierSelected(ev: MatAutocompleteSelectedEvent): void {
    this.filterForm.controls.supplierId.setValue(ev.option.value);
    this.supplierDisplay.setValue(ev.option.viewValue, { emitEvent: false });
  }

  syncSupplierDisplay(): void {
    const id = this.filterForm.controls.supplierId.getRawValue();
    const all = this.thirdPartyService.supplierOptions.value() ?? [];
    const s = all.find((tp) => tp.id === id);
    this.supplierDisplay.setValue(s ? `${s.name} (${s.numIdentification})` : '', {
      emitEvent: false,
    });
  }

  supplierLabel(tp: ThirdPartySupplierOption): string {
    const fullName = [tp.name, tp.lastName].filter(Boolean).join(' ');
    return `${fullName} (${tp.numIdentification})`;
  }

  clearSupplier(): void {
    this.filterForm.controls.supplierId.setValue('');
    this.supplierDisplay.setValue('');
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    const raw = this.filterForm.getRawValue();

    const params = new URLSearchParams({
      page: `${this.page()}`,
      size: `${this.pageSize()}`,
    });

    if (raw.supplierId) {
      params.set('supplierId', raw.supplierId);
    }
    if (raw.period) {
      params.set('period', raw.period);
    }

    this.http
      .get<PageResponse<RetencionEntry>>(`/api/v1/retenciones?${params.toString()}`)
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.data.set(response);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error al cargar las retenciones.');
        },
      });
  }

  onPageChange(ev: PageEvent): void {
    if (ev.pageSize !== this.pageSize()) {
      this.pageSize.set(ev.pageSize);
      this.page.set(0);
    } else {
      this.page.set(ev.pageIndex);
    }
    this.loadData();
  }
}
