import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { TrialBalanceRow } from '../../core/models/journal-entry.model';

@Component({
  selector: 'app-trial-balance',
  standalone: true,
  imports: [DecimalPipe, MatTableModule, MatProgressSpinnerModule],
  template: `
    @if (loading()) {
      <div class="spinner-container">
        <mat-spinner diameter="32" />
      </div>
    } @else {
      <div class="ac-table">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="accountCode">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let r">{{ r.accountCode }}</td>
          </ng-container>
          <ng-container matColumnDef="accountName">
            <th mat-header-cell *matHeaderCellDef>Cuenta</th>
            <td mat-cell *matCellDef="let r">{{ r.accountName }}</td>
          </ng-container>
          <ng-container matColumnDef="totalDebit">
            <th mat-header-cell *matHeaderCellDef>Débito</th>
            <td mat-cell *matCellDef="let r">
              <span class="debit">{{ r.totalDebit | number: '1.0-2' }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="totalCredit">
            <th mat-header-cell *matHeaderCellDef>Crédito</th>
            <td mat-cell *matCellDef="let r">
              <span class="credit">{{ r.totalCredit | number: '1.0-2' }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="balance">
            <th mat-header-cell *matHeaderCellDef>Saldo</th>
            <td mat-cell *matCellDef="let r">
              <span [class.debit]="balance(r) >= 0" [class.credit]="balance(r) < 0">
                {{ balance(r) | number: '1.0-2' }}
              </span>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns()"></tr>
          <tr mat-row *matRowDef="let row; columns: columns()"></tr>
        </table>
      </div>
    }
  `,
  styles: [
    '.spinner-container{display:flex;justify-content:center;padding:32px}',
    '.ac-table{width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:.5rem}',
    '.debit{color:#dc2626;font-weight:500}',
    '.credit{color:#15803d;font-weight:500}',
  ],
})
export class TrialBalanceComponent {
  readonly rows = input.required<TrialBalanceRow[]>();
  readonly loading = input(false);
  readonly columns = input(['accountCode', 'accountName', 'totalDebit', 'totalCredit', 'balance']);

  balance(row: TrialBalanceRow): number {
    return row.totalDebit - row.totalCredit;
  }
}
