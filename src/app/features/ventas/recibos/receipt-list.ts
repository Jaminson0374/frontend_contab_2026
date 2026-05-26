import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { CustomerReceiptService } from '../../../core/services/customer-receipt.service';
import type { CustomerReceipt } from '../../../core/models/customer-receipt.model';

@Component({
  selector: 'app-receipt-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './receipt-list.html',
  styles: [
    '.rl-page{max-width:1100px;margin:0 auto;padding:1rem} .rl-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem} .rl-header-actions{display:flex;gap:0.75rem;align-items:center} .rl-title{font-size:1.25rem;font-weight:600} .search-field{width:240px} .spinner-container{display:flex;justify-content:center;padding:32px} .error-msg{color:#ef4444;text-align:center} .empty-msg{text-align:center;color:#94a3b8;padding:24px} .rl-table{width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden} .rl-row-clickable{cursor:pointer} .rl-row-clickable:hover{background:#f0f9ff}',
  ],
})
export class ReceiptListComponent {
  readonly service = inject(CustomerReceiptService);
  private readonly router = inject(Router);

  readonly page = signal(0);
  readonly size = signal(20);
  readonly cols = [
    'index',
    'clientName',
    'amount',
    'paymentDate',
    'method',
    'reference',
    'createdAt',
  ];

  readonly searchControl = new FormControl('', { nonNullable: true });

  onClientSearch(value: string): void {
    this.service.page.set(0);
    this.service.clientId.set('');
    this.service.reload();
  }

  viewReceipt(receipt: CustomerReceipt): void {
    if (receipt.applications?.length > 0) {
      const arId = receipt.applications[0].arId;
      this.router.navigate(['/ventas/cxc'], {
        queryParams: { clientId: receipt.clientId },
      });
    }
  }

  onPageChange(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.size.set(e.pageSize);
  }

  methodLabel(m: string): string {
    switch (m) {
      case 'CASH':
        return 'Efectivo';
      case 'TRANSFER':
        return 'Transferencia';
      case 'CARD':
        return 'Tarjeta';
      case 'CHECK':
        return 'Cheque';
      default:
        return m;
    }
  }
}
