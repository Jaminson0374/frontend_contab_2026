import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CurrencyPipe } from '@angular/common';
import { CustomPriceService } from '../../../core/services/custom-price.service';
import { CustomPrice } from '../../../core/models/custom-price.model';
import { ThirdParty } from '../../../core/models/third-party.model';
import { PageResponse } from '../../../core/models/page.model';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-custom-price-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    CurrencyPipe,
  ],
  templateUrl: './custom-price-list.html',
  styleUrl: './custom-price-list.css',
})
export class CustomPriceListComponent {
  private readonly service = inject(CustomPriceService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'clientName',
    'productName',
    'price',
    'taxType',
    'taxRate',
    'actions',
  ];

  readonly prices = signal<CustomPrice[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly clientFilter = new FormControl<string>('', { nonNullable: true });

  readonly clients = signal<ThirdParty[]>([]);
  readonly clientsLoading = signal(false);

  constructor() {
    this.loadPrices();
    this.loadClients();

    this.clientFilter.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadPrices());
  }

  private loadPrices(): void {
    this.loading.set(true);
    this.error.set(null);

    const clientId = this.clientFilter.value || undefined;

    this.service.list(clientId, undefined).subscribe({
      next: (data) => {
        this.prices.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar precios por cliente.');
        this.loading.set(false);
      },
    });
  }

  private loadClients(): void {
    this.clientsLoading.set(true);
    this.http.get<PageResponse<ThirdParty>>('/api/v1/third-parties?page=0&size=200').subscribe({
      next: (page) => {
        this.clients.set(page.content);
        this.clientsLoading.set(false);
      },
      error: () => {
        this.clientsLoading.set(false);
      },
    });
  }

  async deletePrice(item: CustomPrice): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar precio por cliente?',
      text: `El precio para "${item.clientName}" del producto "${item.productName}" será eliminado permanentemente.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await firstValueFrom(this.service.delete(item.id));
      this.loadPrices();
      Swal.fire({
        icon: 'success',
        title: 'Eliminado',
        text: 'Precio por cliente eliminado exitosamente.',
        confirmButtonColor: '#15803d',
        timer: 1500,
      });
    } catch (err) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? 'Error al eliminar el precio.';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonColor: '#ef4444',
      });
    }
  }
}
