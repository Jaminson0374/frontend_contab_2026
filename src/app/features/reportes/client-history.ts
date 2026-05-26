import { Component, inject, viewChild, ElementRef, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ThirdPartyService } from '../../core/services/third-party.service';
import { StatementService } from '../../core/services/statement.service';
import { CxcService } from '../../core/services/cxc.service';
import { ReportService } from '../../core/services/report.service';
import { Chart, ArcElement, PieController, Tooltip, Legend } from 'chart.js';
import type { ThirdParty } from '../../core/models/third-party.model';
import type { CustomerStatement } from '../../core/models/statement.model';
import type { ArAgingResponse, AccountsReceivable } from '../../core/models/cxc.model';

Chart.register(ArcElement, PieController, Tooltip, Legend);

@Component({
  selector: 'app-client-history',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
  ],
  templateUrl: './client-history.html',
  styleUrl: './client-history.css',
})
export class ClientHistoryComponent {
  private readonly thirdPartyService = inject(ThirdPartyService);
  private readonly statementService = inject(StatementService);
  private readonly cxcService = inject(CxcService);
  private readonly reportService = inject(ReportService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly clientControl = new FormControl('');
  readonly fromControl = new FormControl('');
  readonly toControl = new FormControl('');

  readonly clients = this.thirdPartyService.thirdParties;

  readonly selectedClient = signal<ThirdParty | null>(null);
  readonly statement = signal<CustomerStatement | null>(null);
  readonly aging = signal<ArAgingResponse | null>(null);
  readonly arList = signal<AccountsReceivable[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);

  readonly agingChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('agingChart');
  private agingChart: Chart | null = null;

  readonly arColumns = [
    'documentNumber',
    'clientName',
    'totalAmount',
    'paidAmount',
    'outstanding',
    'dueDate',
    'status',
  ];
  readonly statementColumns = ['date', 'documentNumber', 'type', 'debit', 'credit', 'balance'];

  onClientSelected(client: ThirdParty): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.selectedClient.set(client);
    this.loaded.set(false);
    this.loading.set(true);
    this.loadClientData(client.id);
  }

  private loadClientData(clientId: string): void {
    const from = this.fromControl.value || '2000-01-01T00:00:00';
    const to = this.toControl.value || new Date().toISOString();

    this.statementService.generate(clientId, from, to).subscribe({
      next: (stmt) => {
        this.statement.set(stmt);
        this.checkDone();
      },
      error: () => this.checkDone(),
    });

    this.cxcService.getAging().subscribe({
      next: (aging) => {
        this.aging.set(aging);
        this.renderAgingChart(aging);
        this.checkDone();
      },
      error: () => this.checkDone(),
    });

    this.cxcService.list(0, 100).subscribe({
      next: (page) => {
        this.arList.set(page.content.filter((a) => a.clientId === clientId));
        this.checkDone();
      },
      error: () => this.checkDone(),
    });
  }

  private pending = 3;
  private checkDone(): void {
    this.pending--;
    if (this.pending <= 0) {
      this.loading.set(false);
      this.loaded.set(true);
      this.pending = 3;
    }
  }

  private renderAgingChart(data: ArAgingResponse): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.agingChart?.destroy();
    const canvas = this.agingChartCanvas()?.nativeElement;
    if (!canvas) return;

    this.agingChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Corriente', '1-30 días', '31-60 días', '61-90 días', '91+ días'],
        datasets: [
          {
            data: [
              data.current.total,
              data.days1to30.total,
              data.days31to60.total,
              data.days61to90.total,
              data.days91Plus.total,
            ],
            backgroundColor: ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Antigüedad de Saldos' } },
      },
    });
  }

  exportExcel(): void {
    const stmt = this.statement();
    const ar = this.arList();
    const aging = this.aging();
    const client = this.selectedClient();
    if (!stmt && !ar.length && !aging) return;

    const rows: Record<string, unknown>[] = [];
    rows.push({ A: 'Cliente', B: client?.name ?? '' });
    rows.push({ A: 'NIT', B: client?.numIdentification ?? '' });
    rows.push({ A: '', B: '' });

    if (stmt) {
      rows.push({ A: 'ESTADO DE CUENTA', B: '' });
      rows.push({ A: 'Saldo inicial', B: stmt.openingBalance });
      stmt.entries.forEach((e) => {
        rows.push({
          A: e.date,
          B: e.documentNumber,
          C: e.type,
          D: e.debit,
          E: e.credit,
          F: e.balance,
        } as Record<string, unknown>);
      });
      rows.push({ A: 'Saldo final', B: stmt.closingBalance });
    }

    this.reportService.exportToExcel(
      rows,
      `cliente_${client?.numIdentification ?? 'x'}`,
      'Historial',
    );
  }

  displayClientFn(c: ThirdParty): string {
    return c ? `${c.name} - ${c.numIdentification}` : '';
  }
}
