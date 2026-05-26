import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { PageResponse } from '../../../core/models/page.model';
import { Shift } from '../../../core/models/shift.model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ShiftService } from '../../../core/services/shift.service';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
  ],
  templateUrl: './shift-list.html',
  styleUrl: './shift-list.css',
})
export class ShiftListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly service = inject(ShiftService);

  readonly displayedColumns = [
    'index',
    'cashRegister',
    'user',
    'openingTime',
    'closingTime',
    'openingAmount',
    'closingAmount',
    'status',
    'actions',
  ];
  readonly pageSizeOptions = [10, 20, 30];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<PageResponse<Shift> | null>(null);
  readonly searchControl = new FormControl('', { nonNullable: true });

  filteredRows(): Shift[] {
    const pageData = this.data();
    if (!pageData) {
      return [];
    }
    return pageData.content;
  }

  ngOnInit(): void {
    this.searchControl.setValue(this.service.query(), { emitEvent: false });
    this.loadShifts();

    this.searchControl.valueChanges
      .pipe(
        startWith(this.searchControl.getRawValue()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.service.query.set(value.trim());
        this.service.page.set(0);
        this.loadShifts();
      });
  }

  private loadShifts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service
      .search(this.service.query(), this.service.page(), this.service.pageSize())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          this.data.set(page);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error cargando turnos. Intentá de nuevo.');
          this.data.set(null);
        },
      });
  }

  statusLabel(status: string): string {
    return status === 'OPEN' ? 'Abierto' : 'Cerrado';
  }

  statusClass(status: string): string {
    return status === 'OPEN' ? 'chip-open' : 'chip-closed';
  }

  openNew(): void {
    this.router.navigate(['nuevo'], { relativeTo: this.route });
  }

  openEdit(id: string): void {
    this.router.navigate([id], { relativeTo: this.route });
  }

  onPageChange(ev: PageEvent): void {
    if (ev.pageSize !== this.service.pageSize()) {
      this.service.pageSize.set(ev.pageSize);
      this.service.page.set(0);
    } else {
      this.service.page.set(ev.pageIndex);
    }

    this.loadShifts();
  }
}
