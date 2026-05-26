import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  computed,
  untracked,
  effect,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AdvanceService } from '../../../core/services/advance.service';
import { ThirdPartyService } from '../../../core/services/third-party.service';
import { Advance } from '../../../core/models/advance.model';
import type { ThirdPartySupplierOption } from '../../../core/models/third-party.model';
import { ApplyAdvanceDialogComponent } from './apply-advance-dialog';

@Component({
  selector: 'app-advance-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './advance-list.html',
  styleUrl: './advance-list.css',
})
export class AdvanceListComponent implements OnInit {
  readonly service = inject(AdvanceService);
  readonly thirdPartyService = inject(ThirdPartyService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'supplierName',
    'amount',
    'remainingAdvance',
    'method',
    'reference',
    'createdAt',
    'actions',
  ];

  readonly pageSizeOptions = [10, 20, 30];

  readonly suppliers = computed(() => this.thirdPartyService.supplierOptions.value() ?? []);

  readonly advanceData = computed(() => this.service.advances.value());

  ngOnInit(): void {
    effect(() => {
      const sid = this.service.supplierId();
      untracked(() => this.service.page.set(0));
    });
  }

  onSupplierChange(id: string | null): void {
    this.service.supplierId.set(id);
  }

  onPageChange(event: PageEvent): void {
    this.service.page.set(event.pageIndex);
    this.service.size.set(event.pageSize);
  }

  methodLabel(method: string): string {
    switch (method) {
      case 'EFECTIVO':
        return 'Efectivo';
      case 'TRANSFERENCIA':
        return 'Transferencia';
      case 'CHEQUE':
        return 'Cheque';
      default:
        return method;
    }
  }

  openNewAdvance(): void {
    this.router.navigate(['/compras/anticipos/nuevo']);
  }

  openApplyDialog(advance: Advance): void {
    this.dialog
      .open(ApplyAdvanceDialogComponent, {
        data: advance,
        width: '520px',
        disableClose: false,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.service.reload();
        }
      });
  }

  remainingClass(remaining: number): string {
    if (remaining <= 0) return 'chip-exhausted';
    if (remaining < 100) return 'chip-low';
    return 'chip-available';
  }
}
