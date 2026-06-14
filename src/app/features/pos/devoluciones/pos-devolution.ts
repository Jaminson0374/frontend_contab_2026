import {
  Component,
  inject,
  signal,
  computed,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SaleService } from '../../../core/services/sale.service';
import { DevolutionService } from '../../../core/services/devolution.service';
import { SalesDocument, SaleItem } from '../../../core/models/sale.model';
import Swal from 'sweetalert2';

interface ReturnLine {
  productId: string;
  productName: string;
  unitPrice: number;
  maxQty: number;
  returnQty: number;
  subtotal: number;
}

@Component({
  selector: 'app-pos-devolution',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos-devolution.html',
  styleUrl: './pos-devolution.css',
})
export class PosDevolutionComponent {
  private readonly saleService = inject(SaleService);
  private readonly devolutionService = inject(DevolutionService);
  private readonly destroyRef = inject(DestroyRef);

  // Invoice search
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchLoading = signal(false);
  readonly invoice = signal<SalesDocument | null>(null);
  readonly invoiceError = signal<string | null>(null);

  // Return lines
  readonly returnLines = signal<ReturnLine[]>([]);
  readonly displayedColumns = ['product', 'qty', 'price', 'actions'];

  // Reason
  readonly reasonControl = new FormControl('', { nonNullable: true });

  // Processing
  readonly processing = signal(false);

  // Computed totals
  readonly totalReturned = computed(() =>
    this.returnLines().reduce((sum, line) => sum + line.subtotal, 0),
  );

  readonly totalReturnedFormatted = computed(() => this.formatCurrency(this.totalReturned()));

  constructor() {
    this.searchControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      const q = value.trim();
      if (q.length >= 2) {
        this.searchInvoice(q);
      }
    });
  }

  private searchInvoice(query: string): void {
    this.searchLoading.set(true);
    this.invoiceError.set(null);
    this.invoice.set(null);
    this.returnLines.set([]);

    this.saleService.search(query, 0, 10, 'INVOICE', 'ISSUED').subscribe({
      next: (page) => {
        this.searchLoading.set(false);
        const invoices = page.content;
        if (invoices.length === 0) {
          this.invoiceError.set('No se encontraron facturas emitidas con ese número.');
          return;
        }
        if (invoices.length === 1) {
          this.loadInvoice(invoices[0]);
        } else {
          // Multiple matches — let user pick
          this.showInvoicePicker(invoices);
        }
      },
      error: () => {
        this.searchLoading.set(false);
        this.invoiceError.set('Error al buscar facturas.');
      },
    });
  }

  private showInvoicePicker(invoices: SalesDocument[]): void {
    const html = invoices
      .map(
        (inv) => `
      <button type="button" class="swal2-confirm swal2-styled" style="margin:4px;width:100%;"
        data-id="${inv.id}">
        ${inv.documentNumber} — ${this.formatCurrency(inv.totalAmount)}
        (${inv.clientName ?? 'Sin cliente'})
      </button>`,
      )
      .join('');

    Swal.fire({
      title: 'Seleccioná la factura',
      html: `<div>${html}</div>`,
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      showConfirmButton: false,
      didOpen: () => {
        const popup = Swal.getPopup()!;
        popup.querySelectorAll('button[data-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = (btn as HTMLElement).dataset['id']!;
            const selected = invoices.find((i) => i.id === id);
            if (selected) {
              Swal.close();
              this.loadInvoice(selected);
            }
          });
        });
      },
    });
  }

  private loadInvoice(inv: SalesDocument): void {
    // Load full invoice with items
    this.saleService.getDocument(inv.id).subscribe({
      next: (full) => {
        this.invoice.set(full);
        // Pre-populate return lines with all items (qty=0)
        this.returnLines.set(
          full.items.map((item) => ({
            productId: item.productId,
            productName: item.productName ?? 'Producto',
            unitPrice: item.unitPrice,
            maxQty: item.quantity,
            returnQty: 0,
            subtotal: 0,
          })),
        );
        this.searchControl.setValue(full.documentNumber, { emitEvent: false });
      },
      error: () => {
        this.invoiceError.set('Error al cargar la factura.');
      },
    });
  }

  incrementReturn(index: number): void {
    this.returnLines.update((lines) =>
      lines.map((l, i) => {
        if (i !== index) return l;
        const qty = Math.min(l.returnQty + 1, l.maxQty);
        return { ...l, returnQty: qty, subtotal: qty * l.unitPrice };
      }),
    );
  }

  decrementReturn(index: number): void {
    this.returnLines.update((lines) =>
      lines.map((l, i) => {
        if (i !== index) return l;
        const qty = Math.max(l.returnQty - 1, 0);
        return { ...l, returnQty: qty, subtotal: qty * l.unitPrice };
      }),
    );
  }

  clearInvoice(): void {
    this.invoice.set(null);
    this.returnLines.set([]);
    this.invoiceError.set(null);
    this.searchControl.setValue('', { emitEvent: false });
  }

  async processDevolution(): Promise<void> {
    const lines = this.returnLines().filter((l) => l.returnQty > 0);
    const inv = this.invoice();
    const reason = this.reasonControl.value.trim();

    if (!inv) {
      Swal.fire({ icon: 'warning', title: 'Sin factura', text: 'Primero buscá una factura.' });
      return;
    }

    if (lines.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin productos',
        text: 'Seleccioná al menos un producto para devolver.',
      });
      return;
    }

    if (!reason) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin motivo',
        text: 'Ingresá el motivo de la devolución.',
      });
      return;
    }

    const total = this.totalReturned();
    const totalStr = this.formatCurrency(total);

    const result = await Swal.fire({
      title: 'Confirmar devolución',
      html: `
        <p>Factura: <strong>${inv.documentNumber}</strong></p>
        <p>Total a devolver: <strong>${totalStr}</strong></p>
        <p>Productos: <strong>${lines.length}</strong></p>
        <p>Motivo: <em>${reason}</em></p>
        <p class="swal-confirm-text">¿Procesar devolución?</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, procesar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    });

    if (!result.isConfirmed) return;

    this.processing.set(true);

    this.devolutionService
      .processDevolution({
        invoiceId: inv.id,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.returnQty })),
        reason,
      })
      .subscribe({
        next: (response) => {
          this.processing.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Devolución procesada',
            html: `
              <p>Nota crédito: <strong>${response.documentNumber}</strong></p>
              <p>Total devuelto: <strong>${this.formatCurrency(response.totalAmount ?? 0)}</strong></p>
              <p>Ítems revertidos: <strong>${response.reversedItems ?? 0}</strong></p>
            `,
            confirmButtonColor: '#15803d',
          }).then(() => {
            this.clearInvoice();
            this.reasonControl.setValue('');
          });
        },
        error: (err) => {
          this.processing.set(false);
          const msg = err?.error?.message ?? 'Error al procesar la devolución.';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: msg,
            confirmButtonColor: '#ef4444',
          });
        },
      });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
