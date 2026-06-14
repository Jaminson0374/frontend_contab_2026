import { Component, DestroyRef, inject, signal, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { AccountingTemplateService } from '../../../core/services/accounting-template.service';
import {
  AccountingTemplate,
  EVENT_TYPE_LABELS,
  MODULE_LABELS,
} from '../../../core/models/accounting-template.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-plantilla-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './plantilla-list.html',
  styleUrl: './plantilla-list.css',
})
export class PlantillaListComponent {
  readonly service = inject(AccountingTemplateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['code', 'name', 'module', 'entriesCount', 'isDefault', 'actions'];

  readonly moduleFilter = new FormControl<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly templates = signal<AccountingTemplate[]>([]);

  readonly moduleOptions: ReadonlyArray<{ value: string | null; label: string }> = [
    { value: null, label: 'Todos' },
    { value: 'SALE', label: 'Ventas' },
    { value: 'PURCHASE', label: 'Compras' },
  ];

  constructor() {
    effect(() => {
      const tpls = this.service.templates.value();
      if (tpls) {
        this.templates.set(tpls);
        this.loading.set(false);
      }
    });

    this.moduleFilter.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((mod) => {
      this.service.module.set(mod);
    });
  }

  loadTemplates(): void {
    this.loading.set(true);
    this.error.set(null);
    this.moduleFilter.setValue(null);
  }

  moduleLabel(mod: string): string {
    return MODULE_LABELS[mod] || 'Desconocido';
  }

  eventTypeLabel(eventType: string): string {
    return EVENT_TYPE_LABELS[eventType] || eventType;
  }

  deleteTemplate(template: AccountingTemplate): void {
    Swal.fire({
      title: '¿Eliminar plantilla?',
      html: `La plantilla <strong>${template.code} — ${template.name}</strong> será eliminada permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.delete(template.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Plantilla eliminada',
              confirmButtonColor: '#15803d',
            });
            this.service.module.update((v) => v);
          },
          error: (err) => {
            const msg = err?.error?.message ?? 'Error al eliminar la plantilla.';
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: msg,
              confirmButtonColor: '#ef4444',
            });
          },
        });
      }
    });
  }
}
