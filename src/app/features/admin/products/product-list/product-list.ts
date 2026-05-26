import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { PageResponse } from '../../../../core/models/page.model';
import { Product } from '../../../../core/models/product.model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ProductService } from '../../../../core/services/product.service';

type ProductListFilter = 'exempt' | 'active' | 'inactive' | 'no-stock' | 'below-min-stock';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly service = inject(ProductService);

  readonly displayedColumns = [
    'index',
    'productCode',
    'name',
    'barcode',
    'totalStock',
    'salePrice',
    'taxType',
    'active',
    'actions',
  ];
  readonly pageSizeOptions = [10, 20, 30];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<PageResponse<Product> | null>(null);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly filterControl = new FormControl<ProductListFilter[]>([], { nonNullable: true });
  readonly filterOptions: ReadonlyArray<{ value: ProductListFilter; label: string }> = [
    { value: 'exempt', label: 'Exentos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'no-stock', label: 'Sin stock' },
    { value: 'below-min-stock', label: 'Por debajo del stock' },
  ];
  selectedFilters: ProductListFilter[] = [];

  filteredRows(): Product[] {
    const pageData = this.data();
    if (!pageData) {
      return [];
    }

    if (this.selectedFilters.length === 0) {
      return pageData.content;
    }

    return pageData.content.filter((product) =>
      this.selectedFilters.every((filter) => this.matchesFilter(product, filter)),
    );
  }

  selectedFilterLabels(): string[] {
    const selectedFilters = new Set(this.selectedFilters);
    return this.filterOptions
      .filter((option) => selectedFilters.has(option.value))
      .map((option) => option.label);
  }

  ngOnInit(): void {
    this.searchControl.setValue(this.service.query(), { emitEvent: false });
    this.loadProducts();

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
        this.loadProducts();
      });

    this.filterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((filters) => {
        this.selectedFilters = filters ?? [];
      });
  }

  private loadProducts(): void {
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
          this.error.set('Error cargando artículos. Intentá de nuevo.');
          this.data.set(null);
        },
      });
  }

  private matchesFilter(product: Product, filter: ProductListFilter): boolean {
    switch (filter) {
      case 'exempt':
        return product.taxType === 'EXENTO';
      case 'active':
        return product.active;
      case 'inactive':
        return !product.active;
      case 'no-stock':
        return product.initialStock <= 0;
      case 'below-min-stock':
        return product.initialStock < product.minStock;
      default:
        return true;
    }
  }

  taxLabel(type: string): string {
    switch (type) {
      case 'IVA_5':
        return 'IVA 5%';
      case 'IVA_8':
        return 'IVA 8%';
      case 'IVA_19':
        return 'IVA 19%';
      default:
        return 'Exento';
    }
  }

  taxClass(type: string): string {
    return type === 'EXENTO' ? 'chip-tax-exento' : 'chip-tax';
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

    this.loadProducts();
  }
}
