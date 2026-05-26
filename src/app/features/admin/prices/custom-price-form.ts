import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsyncPipe } from '@angular/common';
import { CustomPriceService } from '../../../core/services/custom-price.service';
import { CustomPriceRequest } from '../../../core/models/custom-price.model';
import { ThirdParty } from '../../../core/models/third-party.model';
import { Product } from '../../../core/models/product.model';
import { PageResponse } from '../../../core/models/page.model';
import Swal from 'sweetalert2';
import { map, Observable, startWith, switchMap, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-custom-price-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AsyncPipe,
  ],
  templateUrl: './custom-price-form.html',
  styleUrl: './custom-price-form.css',
})
export class CustomPriceFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CustomPriceService);
  private readonly http = inject(HttpClient);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly editId = signal<string | null>(null);

  readonly clients = signal<ThirdParty[]>([]);
  readonly products = signal<Product[]>([]);

  readonly clientSearch = new FormControl('', { nonNullable: true });
  readonly productSearch = new FormControl('', { nonNullable: true });

  readonly filteredClients: Observable<ThirdParty[]>;
  readonly filteredProducts: Observable<Product[]>;

  readonly taxTypes = [
    { value: 'IVA', label: 'IVA' },
    { value: 'INC', label: 'INC' },
    { value: 'EXENTO', label: 'EXENTO' },
  ];

  readonly form = this.fb.nonNullable.group({
    clientId: ['', [Validators.required]],
    productId: ['', [Validators.required]],
    price: [0 as number, [Validators.required, Validators.min(0.01)]],
    taxType: ['IVA', [Validators.required]],
    taxRate: [19 as number, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.loadCustomPrice(id);
    }

    this.loadClients();
    this.loadProducts();

    this.filteredClients = this.clientSearch.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map((query) => this.filterClients(query)),
    );

    this.filteredProducts = this.productSearch.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map((query) => this.filterProducts(query)),
    );
  }

  private filterClients(query: string): ThirdParty[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.clients();
    return this.clients().filter(
      (c) => c.name.toLowerCase().includes(q) || c.numIdentification.toLowerCase().includes(q),
    );
  }

  private filterProducts(query: string): Product[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.products();
    return this.products().filter(
      (p) => p.name.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q),
    );
  }

  displayClient(client: ThirdParty): string {
    return client ? `${client.name} (${client.numIdentification})` : '';
  }

  displayProduct(product: Product): string {
    return product ? `${product.productCode} - ${product.name}` : '';
  }

  onClientSelected(client: ThirdParty): void {
    this.form.controls.clientId.setValue(client.id);
  }

  onProductSelected(product: Product): void {
    this.form.controls.productId.setValue(product.id);
  }

  onTaxTypeChange(taxType: string): void {
    if (taxType === 'IVA') {
      this.form.controls.taxRate.setValue(19);
    } else if (taxType === 'INC') {
      this.form.controls.taxRate.setValue(8);
    } else {
      this.form.controls.taxRate.setValue(0);
    }
  }

  private loadClients(): void {
    this.http.get<PageResponse<ThirdParty>>('/api/v1/third-parties?page=0&size=500').subscribe({
      next: (page) => this.clients.set(page.content),
      error: () => {},
    });
  }

  private loadProducts(): void {
    this.http.get<PageResponse<Product>>('/api/v1/products?page=0&size=500').subscribe({
      next: (page) => this.products.set(page.content),
      error: () => {},
    });
  }

  private loadCustomPrice(id: string): void {
    this.loading.set(true);
    this.service.list(undefined, undefined).subscribe({
      next: (all) => {
        const found = all.find((cp) => cp.id === id);
        if (found) {
          this.form.patchValue({
            clientId: found.clientId,
            productId: found.productId,
            price: found.price,
            taxType: found.taxType,
            taxRate: found.taxRate,
          });
          // Set search box display values
          this.clientSearch.setValue(found.clientName || found.clientId, { emitEvent: false });
          this.productSearch.setValue(found.productName || found.productId, { emitEvent: false });
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar el precio.');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const body: CustomPriceRequest = {
      clientId: v.clientId,
      productId: v.productId,
      price: v.price,
      taxType: v.taxType,
      taxRate: v.taxRate,
    };

    this.saving.set(true);
    this.error.set(null);

    if (this.isEdit()) {
      this.service.update(this.editId()!, body).subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Precio actualizado',
            confirmButtonColor: '#15803d',
          }).then(() => {
            this.router.navigate(['/administracion/precios/cliente']);
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al actualizar el precio.';
          this.error.set(msg);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: msg,
            confirmButtonColor: '#ef4444',
          });
        },
      });
    } else {
      this.service.create(body).subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Precio creado',
            text: 'Precio por cliente creado exitosamente.',
            confirmButtonColor: '#15803d',
          }).then(() => {
            this.router.navigate(['/administracion/precios/cliente']);
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al crear el precio.';
          this.error.set(msg);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: msg,
            confirmButtonColor: '#ef4444',
          });
        },
      });
    }
  }
}
