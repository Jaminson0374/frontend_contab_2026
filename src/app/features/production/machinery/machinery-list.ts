import { Component, inject, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { MachineryService } from '../../../core/services/machinery.service';
import type { Machinery } from '../../../core/models/machinery.model';

@Component({
  selector: 'app-machinery-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './machinery-list.html',
  styles: [
    '.ml-page{max-width:800px;margin:0 auto;padding:1rem} .ml-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem} .ml-title{font-size:1.25rem;font-weight:600} .spinner-container{display:flex;justify-content:center;padding:32px} .chip-operational{background:#dcfce7;color:#15803d} .chip-maintenance{background:#fef3c7;color:#d97706} .chip-decommissioned{background:#fee2e2;color:#dc2626} .ml-chip{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.75rem;font-weight:600}',
  ],
})
export class MachineryListComponent implements OnInit {
  private readonly service = inject(MachineryService);
  readonly loading = signal(false);
  readonly data = signal<Machinery[]>([]);
  readonly cols = ['code', 'name', 'machineryType', 'status', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  typeLabel(t: string): string {
    switch (t) {
      case 'MOLINO':
        return 'Molino';
      case 'MEZCLADORA':
        return 'Mezcladora';
      case 'EMBUTIDORA':
        return 'Embutidora';
      case 'AHUMADOR':
        return 'Ahumador';
      case 'EMPACADORA':
        return 'Empacadora';
      case 'SELLADORA':
        return 'Selladora';
      case 'BASCULA':
        return 'Báscula';
      default:
        return 'Otro';
    }
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'OPERATIONAL':
        return 'Operativa';
      case 'MAINTENANCE':
        return 'Mantenimiento';
      case 'DECOMMISSIONED':
        return 'Fuera de servicio';
      default:
        return s;
    }
  }

  statusClass(s: string): string {
    return 'chip-' + s.toLowerCase();
  }

  deactivate(id: string): void {
    this.service
      .deactivate(id)
      .subscribe({
        next: () => this.load(),
        error: (err) => alert(err?.error?.message ?? 'Error'),
      });
  }
}
