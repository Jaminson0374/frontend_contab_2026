import { Component, inject, signal, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../../core/services/product.service';
import { FormulaService } from '../../../core/services/formula.service';
import { ProductionService } from '../../../core/services/production.service';
import { WarehouseService } from '../../../core/services/warehouse.service';
import {
  ProductFormula,
  ProduceRequest,
  BatchItemResponse,
} from '../../../core/models/product-formula.model';
import { Product } from '../../../core/models/product.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-production-batch',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './production-batch.html',
  styleUrl: './production-batch.css',
})
export class ProductionBatchComponent {
  private readonly route = inject(ActivatedRoute);
  readonly productService = inject(ProductService);
  private readonly formulaService = inject(FormulaService);
  private readonly productionService = inject(ProductionService);
  readonly warehouseService = inject(WarehouseService);

  readonly loading = signal(false);
  readonly producing = signal(false);
  readonly step = signal(1);

  // Step 1
  readonly availableFormulas = signal<Product[]>([]);
  readonly selectedFormulaId = signal('');
  readonly selectedProduct = signal<Product | null>(null);

  // Step 2
  readonly components = signal<ProductFormula[]>([]);

  // Step 3
  readonly quantity = signal(1);
  readonly warehouseId = signal('');
  readonly laborCost = signal(0);
  readonly overheadCost = signal<number | null>(null);

  // Step 4 - result
  readonly batchResult = signal<{
    batchId: string;
    productName: string;
    quantityProduced: number;
    mpd: number;
    mod: number;
    cif: number;
    totalCost: number;
    unitCost: number;
    shrinkage: number;
    items: BatchItemResponse[];
  } | null>(null);

  constructor() {
    this.loadAvailableFormulas();
    // Check query params for formulaId
    this.route.queryParams.subscribe((params) => {
      if (params['formulaId']) {
        this.selectedFormulaId.set(params['formulaId']);
        this.loadComponents();
      }
    });
  }

  loadAvailableFormulas(): void {
    this.productService.search('', 0, 200).subscribe({
      next: (page) => {
        this.availableFormulas.set(page.content.filter((p) => p.productTypeId));
      },
    });
  }

  onFormulaSelected(): void {
    const id = this.selectedFormulaId();
    const prod = this.availableFormulas().find((p) => p.id === id);
    this.selectedProduct.set(prod ?? null);
    this.loadComponents();
  }

  loadComponents(): void {
    const id = this.selectedFormulaId();
    if (!id) return;
    this.loading.set(true);
    this.formulaService.list(id).subscribe({
      next: (data) => {
        this.components.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  nextStep(): void {
    this.step.update((s) => s + 1);
  }
  prevStep(): void {
    this.step.update((s) => s - 1);
  }

  produce(): void {
    if (!this.selectedFormulaId() || !this.warehouseId() || this.quantity() <= 0) return;

    const req: ProduceRequest = {
      formulaProductId: this.selectedFormulaId(),
      warehouseId: this.warehouseId(),
      quantity: this.quantity(),
      laborCost: this.laborCost(),
      overheadCost: this.overheadCost(),
      notes: null,
    };

    this.producing.set(true);
    this.productionService.produce(req).subscribe({
      next: (result) => {
        this.producing.set(false);
        this.batchResult.set(result);
        this.step.set(4);
        Swal.fire({
          icon: 'success',
          title: 'Producción completada',
          timer: 2000,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.producing.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message ?? 'Error en producción.',
        });
      },
    });
  }

  getMpdEstimate(): number {
    // Simplified estimate - actual calculation happens server-side
    let total = 0;
    for (const c of this.components()) {
      total += c.quantity * this.quantity() * 100; // placeholder
    }
    return total;
  }
}
