import { Component, inject, input, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { FormulaService } from '../../../core/services/formula.service';
import { ProductService } from '../../../core/services/product.service';
import { UnitOfMeasureService } from '../../../core/services/unit-of-measure.service';
import { ProductFormula } from '../../../core/models/product-formula.model';
import { Product } from '../../../core/models/product.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-formula-tab',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './formula-tab.html',
  styleUrl: './formula-tab.css',
})
export class FormulaTabComponent {
  readonly productId = input.required<string>();

  private readonly formulaService = inject(FormulaService);
  readonly productService = inject(ProductService);
  readonly uomService = inject(UnitOfMeasureService);
  private readonly router = inject(Router);

  readonly formulas = signal<ProductFormula[]>([]);
  readonly loading = signal(false);
  readonly adding = signal(false);
  readonly editingId = signal<string | null>(null);

  // Search for components (filter out the parent product)
  readonly componentSearch = signal('');
  readonly componentResults = signal<Product[]>([]);
  readonly componentSearchLoading = signal(false);

  // Edit form fields
  readonly editComponentId = signal('');
  readonly editQuantity = signal(1);
  readonly editUomId = signal<string | null>(null);
  readonly editSeq = signal(0);
  readonly editNotes = signal('');

  constructor() {
    effect(() => {
      const id = this.productId();
      if (id) this.loadFormulas();
    });
  }

  loadFormulas(): void {
    this.loading.set(true);
    this.formulaService.list(this.productId()).subscribe({
      next: (data) => {
        this.formulas.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  searchComponents(): void {
    const q = this.componentSearch().trim();
    if (!q) {
      this.componentResults.set([]);
      return;
    }
    this.componentSearchLoading.set(true);
    this.productService.search(q).subscribe({
      next: (page) => {
        this.componentResults.set(page.content.filter((p) => p.id !== this.productId()));
        this.componentSearchLoading.set(false);
      },
      error: () => this.componentSearchLoading.set(false),
    });
  }

  startAdd(): void {
    this.adding.set(true);
    this.editingId.set(null);
    this.editComponentId.set('');
    this.editQuantity.set(1);
    this.editUomId.set(null);
    this.editSeq.set(this.formulas().length);
    this.editNotes.set('');
    this.componentSearch.set('');
    this.componentResults.set([]);
  }

  startEdit(row: ProductFormula): void {
    this.adding.set(false);
    this.editingId.set(row.id);
    this.editComponentId.set(row.componentProductId);
    this.editQuantity.set(row.quantity);
    this.editUomId.set(row.unitOfMeasureId);
    this.editSeq.set(row.sequenceNumber);
    this.editNotes.set(row.notes ?? '');
  }

  cancelEdit(): void {
    this.adding.set(false);
    this.editingId.set(null);
  }

  selectComponent(product: Product): void {
    this.editComponentId.set(product.id);
    this.componentSearch.set(product.name);
    this.componentResults.set([]);
  }

  saveNew(): void {
    if (!this.editComponentId() || this.editQuantity() <= 0) return;
    this.formulaService
      .add(this.productId(), {
        componentProductId: this.editComponentId(),
        quantity: this.editQuantity(),
        unitOfMeasureId: this.editUomId(),
        sequenceNumber: this.editSeq(),
        notes: this.editNotes() || null,
      })
      .subscribe({
        next: () => {
          this.adding.set(false);
          this.loadFormulas();
        },
        error: (err) =>
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message ?? 'No se pudo agregar.',
          }),
      });
  }

  saveEdit(row: ProductFormula): void {
    this.formulaService
      .update(this.productId(), row.id, {
        quantity: this.editQuantity(),
        unitOfMeasureId: this.editUomId(),
        sequenceNumber: this.editSeq(),
        notes: this.editNotes() || null,
      })
      .subscribe({
        next: () => {
          this.editingId.set(null);
          this.loadFormulas();
        },
        error: (err) =>
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message ?? 'No se pudo actualizar.',
          }),
      });
  }

  removeFormula(row: ProductFormula): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar componente?',
      text: 'Se eliminará de la fórmula.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (result.isConfirmed) {
        this.formulaService.remove(this.productId(), row.id).subscribe({
          next: () => this.loadFormulas(),
          error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar.' }),
        });
      }
    });
  }

  navigateToProduction(): void {
    this.router.navigate(['/inventario/produccion/nuevo'], {
      queryParams: { formulaId: this.productId() },
    });
  }
}
