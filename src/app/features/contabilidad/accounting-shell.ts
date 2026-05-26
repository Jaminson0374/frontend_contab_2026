import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JournalEntryService } from '../../core/services/journal-entry.service';
import type { JournalEntry, TrialBalanceRow } from '../../core/models/journal-entry.model';

@Component({
  selector: 'app-accounting-shell',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    SlicePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './accounting-shell.html',
  styles: [
    '.ac-page{max-width:1200px;margin:0 auto;padding:1rem} .ac-title{font-size:1.25rem;font-weight:600;margin-bottom:1rem} .spinner-container{display:flex;justify-content:center;padding:32px} .ac-table{width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:.5rem} .chip-sale{background:#dcfce7;color:#15803d} .chip-purchase{background:#dbeafe;color:#1d4ed8} .chip-manual{background:#fef3c7;color:#d97706} .chip-inventory{background:#f3e8ff;color:#7c3aed} .chip-payment{background:#cffafe;color:#0e7490} .ac-chip{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.75rem;font-weight:600} .debit{color:#dc2626;font-weight:500} .credit{color:#15803d;font-weight:500}',
  ],
})
export class AccountingShellComponent implements OnInit {
  private readonly service = inject(JournalEntryService);

  readonly loading = signal(false);
  readonly entries = signal<JournalEntry[]>([]);
  readonly trialBalance = signal<TrialBalanceRow[]>([]);
  readonly entriesCols = [
    'entryNumber',
    'entryDate',
    'description',
    'sourceType',
    'lines',
    'actions',
  ];
  readonly balanceCols = ['accountCode', 'accountName', 'totalDebit', 'totalCredit', 'balance'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (d) => {
        this.entries.set(d);
        this.loadBalance();
      },
      error: () => this.loading.set(false),
    });
  }

  loadBalance(): void {
    this.service.trialBalance().subscribe({
      next: (d) => {
        this.trialBalance.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  sourceLabel(s: string): string {
    switch (s) {
      case 'SALE':
        return 'Venta';
      case 'PURCHASE':
        return 'Compra';
      case 'INVENTORY':
        return 'Inventario';
      case 'PAYMENT':
        return 'Pago';
      default:
        return 'Manual';
    }
  }

  sourceClass(s: string): string {
    return 'chip-' + s.toLowerCase();
  }

  lineCount(entry: JournalEntry): string {
    return (entry.lines?.length ?? 0) + ' líneas';
  }

  balance(row: TrialBalanceRow): number {
    return row.totalDebit - row.totalCredit;
  }
}
