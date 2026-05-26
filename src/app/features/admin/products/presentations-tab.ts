import { Component, inject, input, signal, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PresentationService } from '../../../core/services/presentation.service';
import { UnitOfMeasureService } from '../../../core/services/unit-of-measure.service';
import {
  ProductPresentation,
  ProductPresentationRequest,
} from '../../../core/models/product-presentation.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-presentations-tab',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './presentations-tab.html',
  styleUrl: './presentations-tab.css',
})
export class PresentationsTabComponent {
  readonly productId = input.required<string>();

  private readonly presentationService = inject(PresentationService);
  readonly uomService = inject(UnitOfMeasureService);

  readonly presentations = signal<ProductPresentation[]>([]);
  readonly loading = signal(false);
  readonly editingRow = signal<ProductPresentation | null>(null);
  readonly adding = signal(false);

  // New/edit form fields
  readonly editCode = signal('');
  readonly editName = signal('');
  readonly editUomId = signal('');
  readonly editFactor = signal(1);
  readonly editPrice = signal<number | null>(null);
  readonly editIsDefault = signal(false);

  readonly displayedColumns = ['code', 'name', 'uom', 'factor', 'price', 'isDefault', 'actions'];

  constructor() {
    effect(() => {
      const id = this.productId();
      if (id) {
        this.loadPresentations();
      }
    });
  }

  loadPresentations(): void {
    this.loading.set(true);
    this.presentationService.list(this.productId()).subscribe({
      next: (data) => {
        this.presentations.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  startAdd(): void {
    this.adding.set(true);
    this.editingRow.set(null);
    this.editCode.set('');
    this.editName.set('');
    this.editUomId.set('');
    this.editFactor.set(1);
    this.editPrice.set(null);
    this.editIsDefault.set(false);
  }

  startEdit(row: ProductPresentation): void {
    this.adding.set(false);
    this.editingRow.set(row);
    this.editCode.set(row.code);
    this.editName.set(row.name);
    this.editUomId.set(row.unitOfMeasureId);
    this.editFactor.set(row.conversionFactor);
    this.editPrice.set(row.salePrice);
    this.editIsDefault.set(row.isDefault);
  }

  cancelEdit(): void {
    this.adding.set(false);
    this.editingRow.set(null);
  }

  saveNew(): void {
    if (!this.editCode() || !this.editName() || !this.editUomId()) return;

    const req: ProductPresentationRequest = {
      code: this.editCode(),
      name: this.editName(),
      unitOfMeasureId: this.editUomId(),
      conversionFactor: this.editFactor(),
      salePrice: this.editPrice(),
      isDefault: this.editIsDefault(),
    };

    this.presentationService.create(this.productId(), req).subscribe({
      next: () => {
        this.adding.set(false);
        this.loadPresentations();
        Swal.fire({
          icon: 'success',
          title: 'Presentación creada',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message ?? 'No se pudo crear la presentación.',
        });
      },
    });
  }

  saveEdit(row: ProductPresentation): void {
    if (!this.editCode() || !this.editName() || !this.editUomId()) return;

    const req: ProductPresentationRequest = {
      code: this.editCode(),
      name: this.editName(),
      unitOfMeasureId: this.editUomId(),
      conversionFactor: this.editFactor(),
      salePrice: this.editPrice(),
      isDefault: this.editIsDefault(),
    };

    this.presentationService.update(this.productId(), row.id, req).subscribe({
      next: () => {
        this.editingRow.set(null);
        this.loadPresentations();
        Swal.fire({
          icon: 'success',
          title: 'Presentación actualizada',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message ?? 'No se pudo actualizar.',
        });
      },
    });
  }

  deletePresentation(row: ProductPresentation): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar presentación?',
      text: `Se eliminará "${row.code} - ${row.name}"`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (result.isConfirmed) {
        this.presentationService.delete(this.productId(), row.id).subscribe({
          next: () => {
            this.loadPresentations();
            Swal.fire({
              icon: 'success',
              title: 'Eliminada',
              timer: 1500,
              showConfirmButton: false,
            });
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar.' });
          },
        });
      }
    });
  }

  setAsDefault(row: ProductPresentation): void {
    const req: ProductPresentationRequest = {
      code: row.code,
      name: row.name,
      unitOfMeasureId: row.unitOfMeasureId,
      conversionFactor: row.conversionFactor,
      salePrice: row.salePrice,
      isDefault: true,
    };
    this.presentationService.update(this.productId(), row.id, req).subscribe({
      next: () => {
        this.loadPresentations();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message ?? 'No se pudo marcar como predeterminada.',
        });
      },
    });
  }
}
