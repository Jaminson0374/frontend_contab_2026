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
import { CurrencyPipe, DatePipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { PaymentService } from '../../../../core/services/payment.service';

type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA';

@Component({
  selector: 'app-pago-list',
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
  templateUrl: './pago-list.html',
  styleUrl: './pago-list.css',
})
export class PagoListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly service = inject(PaymentService);

  readonly displayedColumns = [
    'supplierName',
    'amount',
    'paymentDate',
    'method',
    'reference',
    'createdAt',
  ];
  readonly pageSizeOptions = [10, 20, 50];
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly methodLabels: Record<PaymentMethod, string> = {
    EFECTIVO: 'Efectivo',
    TRANSFERENCIA: 'Transferencia',
    CHEQUE: 'Cheque',
    TARJETA: 'Tarjeta',
  };

  readonly methodClass: Record<PaymentMethod, string> = {
    EFECTIVO: 'chip-method-efectivo',
    TRANSFERENCIA: 'chip-method-transferencia',
    CHEQUE: 'chip-method-cheque',
    TARJETA: 'chip-method-tarjeta',
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

  openNew(): void {
    this.router.navigate(['nuevo'], { relativeTo: this.route });
  }

  getMethodLabel(method: string): string {
    return this.methodLabels[method as PaymentMethod] ?? method;
  }

  getMethodClass(method: string): string {
    return this.methodClass[method as PaymentMethod] ?? 'chip-method-default';
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
