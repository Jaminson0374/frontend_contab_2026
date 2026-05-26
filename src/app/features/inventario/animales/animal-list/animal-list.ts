import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe, DecimalPipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { AnimalService } from '../../../../core/services/animal.service';
import { AuthService } from '../../../../core/auth/auth.service';
import type { AnimalStatus, Species } from '../../../../core/models/animal.model';
import { AnimalFormComponent } from '../animal-form/animal-form';

@Component({
  selector: 'app-animal-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './animal-list.html',
  styleUrl: './animal-list.css',
})
export class AnimalListComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  readonly service = inject(AnimalService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly displayedColumns = [
    'receptionDate',
    'icaLotNumber',
    'species',
    'liveWeight',
    'status',
    'actions',
  ];

  readonly pageSizeOptions = [10, 20, 30];
  readonly isAdmin = this.auth.userRole;

  readonly statusOptions: { value: AnimalStatus | null; label: string }[] = [
    { value: null, label: 'Todos' },
    { value: 'RECEIVED', label: 'Recibido' },
    { value: 'IN_SLAUGHTER', label: 'En faena' },
    { value: 'SLAUGHTERED', label: 'Faenado' },
  ];

  readonly statusLabels: Record<AnimalStatus, string> = {
    RECEIVED: 'Recibido',
    IN_SLAUGHTER: 'En faena',
    SLAUGHTERED: 'Faenado',
  };

  readonly speciesLabels: Record<Species, string> = {
    PORCINO: 'Porcino',
    BOVINO: 'Bovino',
    OVINO: 'Ovino',
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
        this.service.query.set(value.trim());
        this.service.page.set(0);
        this.service.reload();
      });
  }

  onStatusChange(value: AnimalStatus | null): void {
    this.service.status.set(value);
    this.service.page.set(0);
  }

  openForm(): void {
    const ref = this.dialog.open(AnimalFormComponent, { width: '600px' });
    ref.afterClosed().subscribe((saved) => {
      if (saved) this.service.reload();
    });
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as AnimalStatus] ?? status;
  }

  getSpeciesLabel(species: string): string {
    return this.speciesLabels[species as Species] ?? species;
  }

  openSlaughter(id: string): void {
    window.open(`/inventario/animales/${id}/faena`, '_self');
  }

  deleteAnimal(id: string): void {
    if (!confirm('¿Eliminar este animal? Esta acción no se puede deshacer.')) return;
    this.service.delete(id).subscribe(() => this.service.reload());
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
