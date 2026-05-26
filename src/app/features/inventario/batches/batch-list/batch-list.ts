import { Component, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe, DecimalPipe } from '@angular/common';
import { BatchService } from '../../../../core/services/batch.service';
import { BatchStatus } from '../../../../core/models/batch.model';
import { BatchFormComponent } from '../batch-form/batch-form';

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatSelectModule, MatProgressSpinnerModule,
    DatePipe, DecimalPipe,
  ],
  templateUrl: './batch-list.html',
  styleUrl: './batch-list.css',
})
export class BatchListComponent {
  private readonly dialog = inject(MatDialog);
  readonly service = inject(BatchService);

  readonly displayedColumns = ['entryDate', 'status', 'initialWeight', 'purchaseCost', 'notes', 'actions'];

  readonly statusOptions: { value: BatchStatus | null; label: string }[] = [
    { value: null,         label: 'Todos' },
    { value: 'OPEN',       label: 'Abierto' },
    { value: 'PROCESSING', label: 'En proceso' },
    { value: 'CLOSED',     label: 'Cerrado' },
  ];

  readonly statusLabels: Record<BatchStatus, string> = {
    OPEN:       'Abierto',
    PROCESSING: 'En proceso',
    CLOSED:     'Cerrado',
  };

  onStatusChange(value: BatchStatus | null): void {
    this.service.status.set(value);
    this.service.page.set(0);
  }

  openForm(): void {
    const ref = this.dialog.open(BatchFormComponent, { width: '600px' });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.service.reload();
    });
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as BatchStatus] ?? status;
  }

  closeStatus(id: string): void {
    this.service.updateStatus(id, 'CLOSED').subscribe(() => this.service.reload());
  }

  nextPage(): void {
    this.service.page.update(p => p + 1);
  }

  prevPage(): void {
    this.service.page.update(p => Math.max(0, p - 1));
  }
}
