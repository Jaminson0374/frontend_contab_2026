import { Component, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe, SlicePipe } from '@angular/common';
import { DianService } from '../../../core/services/dian.service';
import {
  STATUS_LABELS,
  STATUS_CHIP_COLOR,
  type ElectronicInvoice,
} from '../../../core/models/dian.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-electronic-invoice-list',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    DatePipe,
    SlicePipe,
  ],
  templateUrl: './electronic-invoice-list.html',
  styleUrl: './electronic-invoice-list.css',
})
export class ElectronicInvoiceListComponent {
  private readonly dianService = inject(DianService);
  private readonly dialog = inject(MatDialog);

  readonly invoices = this.dianService.electronicInvoices;
  readonly statusLabels = STATUS_LABELS;

  readonly displayedColumns = ['salesDocumentId', 'cufe', 'status', 'sentAt', 'actions'];

  retry(id: string): void {
    this.dianService.retryInvoice(id).subscribe({
      next: () => {
        this.invoices.reload();
        Swal.fire('Reintentado', 'Reenvío programado.', 'success');
      },
      error: (err) => {
        Swal.fire('Error', err?.error?.message ?? 'Error al reintentar', 'error');
      },
    });
  }

  showQr(invoice: ElectronicInvoice): void {
    if (!invoice.qrCode) {
      Swal.fire('Sin QR', 'No hay código QR disponible.', 'info');
      return;
    }
    Swal.fire({
      title: 'Código QR — ' + (invoice.cufe ?? ''),
      html: `<img src="data:image/png;base64,${invoice.qrCode}" style="max-width:256px;margin:0 auto" />
             <p class="text-xs text-slate-500 mt-2">CUFE: ${invoice.cufe ?? 'N/A'}</p>`,
      showCloseButton: true,
      showConfirmButton: false,
    });
  }

  getChipClass(status: string): string {
    switch (status) {
      case 'PENDING_SEND':
        return 'chip-pending';
      case 'SENT':
        return 'chip-sent';
      case 'ACCEPTED_BY_DIAN':
        return 'chip-accepted';
      case 'REJECTED_BY_DIAN':
        return 'chip-rejected';
      default:
        return '';
    }
  }
}
