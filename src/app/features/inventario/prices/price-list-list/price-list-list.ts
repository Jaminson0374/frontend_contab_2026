import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom, map, startWith } from 'rxjs';
import Swal from 'sweetalert2';

import { PriceList } from '../../../../core/models/product-catalog.model';
import { PriceListService } from '../../../../core/services/price-list.service';
import {
  QuickCreatePriceListData,
  QuickCreatePriceListDialogComponent,
} from '../dialogs/quick-create-price-list.dialog';

@Component({
  selector: 'app-price-list-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './price-list-list.html',
  styleUrl: './price-list-list.css',
})
export class PriceListListComponent {
  private readonly dialog = inject(MatDialog);
  readonly service = inject(PriceListService);

  readonly displayedColumns = ['index', 'code', 'name', 'description', 'active', 'actions'];
  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly query = toSignal(
    this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.getRawValue()),
      map((value) => value.trim().toLowerCase()),
    ),
    { initialValue: '' },
  );

  readonly filteredPriceLists = computed(() => {
    const priceLists = this.service.priceLists.value() ?? [];
    const query = this.query();

    if (!query) {
      return priceLists;
    }

    return priceLists.filter((priceList) =>
      [priceList.code, priceList.name, priceList.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });

  openCreateDialog(): void {
    this.dialog.open<QuickCreatePriceListDialogComponent, QuickCreatePriceListData, PriceList>(
      QuickCreatePriceListDialogComponent,
      {
        disableClose: true,
        width: '420px',
        data: { initialName: this.searchControl.getRawValue().trim() },
      },
    );
  }

  openEditDialog(priceList: PriceList): void {
    this.dialog.open<QuickCreatePriceListDialogComponent, QuickCreatePriceListData, PriceList>(
      QuickCreatePriceListDialogComponent,
      {
        disableClose: true,
        width: '420px',
        data: { priceList },
      },
    );
  }

  async delete(priceList: PriceList): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar lista de precios?',
      text: `La lista "${priceList.name}" dejará de estar disponible para nuevas asignaciones.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await firstValueFrom(this.service.deactivate(priceList.id));
      this.service.reload();
    } catch (error) {
      const message = (error as { error?: { message?: string } })?.error?.message
        ?? 'Error al eliminar la lista de precios.';

      await Swal.fire({
        icon: 'error',
        title: 'No se pudo eliminar',
        text: message,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ef4444',
      });
    }
  }
}
