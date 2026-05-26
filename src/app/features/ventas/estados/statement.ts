import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { StatementService } from '../../../core/services/statement.service';
import { ThirdPartyService } from '../../../core/services/third-party.service';
import type { CustomerStatement, StatementEntry } from '../../../core/models/statement.model';
import type { ThirdPartySupplierOption } from '../../../core/models/third-party.model';

@Component({
  selector: 'app-statement',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
  ],
  templateUrl: './statement.html',
  styles: [
    '.st-page{max-width:1100px;margin:0 auto;padding:1rem} .st-title{font-size:1.25rem;font-weight:600;margin-bottom:1rem} .st-controls{display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1.5rem} .st-controls mat-form-field{min-width:200px} .st-result{margin-top:1rem} .st-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem} .st-table{width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:.85rem} .st-row{display:grid;grid-template-columns:100px 140px 70px 1fr 110px 110px 110px;padding:.4rem .75rem;border-bottom:1px solid #f1f5f9} .st-row-header{background:#f8fafc;font-weight:600;color:#475569;font-size:.8rem} .st-row-debit{color:#dc2626} .st-row-credit{color:#16a34a} .st-totals{display:flex;justify-content:space-between;padding:.75rem;background:#f8fafc;font-weight:600;border-top:2px solid #e2e8f0} .error-msg{color:#ef4444} .spinner-container{display:flex;justify-content:center;padding:32px}',
  ],
})
export class StatementComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(StatementService);
  readonly thirdPartyService = inject(ThirdPartyService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly statement = signal<CustomerStatement | null>(null);
  readonly clientSearch = signal('');

  readonly form = this.fb.nonNullable.group({
    clientId: ['', Validators.required],
    from: [new Date(new Date().getFullYear(), 0, 1), Validators.required],
    to: [new Date(), Validators.required],
  });

  onClientSelected(ev: MatAutocompleteSelectedEvent): void {
    this.form.controls.clientId.setValue(ev.option.value);
  }

  clientLabel(tp: ThirdPartySupplierOption): string {
    return `${tp.name || ''} (${tp.numIdentification})`;
  }

  generate(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const from = v.from instanceof Date ? v.from.toISOString().split('T')[0] : v.from;
    const to = v.to instanceof Date ? v.to.toISOString().split('T')[0] : v.to;

    this.loading.set(true);
    this.error.set(null);
    this.statement.set(null);

    this.service.generate(v.clientId, from, to).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.statement.set(r);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al generar el estado de cuenta.');
      },
    });
  }

  entryClass(entry: StatementEntry): string {
    return entry.type === 'INVOICE' ? 'st-row-debit' : 'st-row-credit';
  }
}
