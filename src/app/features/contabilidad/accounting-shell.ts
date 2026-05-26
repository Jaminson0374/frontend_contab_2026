import { Component, inject, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JournalEntryService } from '../../core/services/journal-entry.service';
import { JournalEntryListComponent } from './journal-entry-list';
import { TrialBalanceComponent } from './trial-balance';
import { JournalEntryFormComponent } from './journal-entry-form';
import type { JournalEntry, TrialBalanceRow } from '../../core/models/journal-entry.model';

@Component({
  selector: 'app-accounting-shell',
  standalone: true,
  imports: [
    MatTabsModule,
    MatProgressSpinnerModule,
    JournalEntryListComponent,
    TrialBalanceComponent,
    JournalEntryFormComponent,
  ],
  template: `
    <div class="ac-page">
      <h1 class="ac-title">Contabilidad</h1>
      @if (showForm()) {
        <app-journal-entry-form (cancel)="showForm.set(false)" (saved)="onSaved()" />
      } @else {
        <mat-tab-group>
          <mat-tab label="Asientos">
            <div class="pt-4">
              <app-journal-entry-list
                [entries]="entries()"
                [loading]="loading()"
                (createClick)="showForm.set(true)"
              />
            </div>
          </mat-tab>
          <mat-tab label="Balance de comprobación">
            <div class="pt-4">
              <app-trial-balance [rows]="trialBalance()" [loading]="loading()" />
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: [
    '.ac-page{max-width:1200px;margin:0 auto;padding:1rem}',
    '.ac-title{font-size:1.25rem;font-weight:600;margin-bottom:1rem}',
    '.pt-4{padding-top:1rem}',
  ],
})
export class AccountingShellComponent {
  private readonly service = inject(JournalEntryService);

  readonly loading = signal(false);
  readonly entries = signal<JournalEntry[]>([]);
  readonly trialBalance = signal<TrialBalanceRow[]>([]);
  readonly showForm = signal(false);

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (data) => {
        this.entries.set(data);
        this.loadBalance();
      },
      error: () => this.loading.set(false),
    });
  }

  private loadBalance(): void {
    this.service.trialBalance().subscribe({
      next: (data) => {
        this.trialBalance.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSaved(): void {
    this.showForm.set(false);
    this.loadData();
  }
}
