import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AccountingTemplateService } from '../../../core/services/accounting-template.service';
import { PucAccountService } from '../../../core/services/puc-account.service';
import {
  AccountingTemplateEntryRequest,
  EVENT_TYPE_LABELS,
} from '../../../core/models/accounting-template.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-plantilla-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatAutocompleteModule,
  ],
  templateUrl: './plantilla-form.html',
  styleUrl: './plantilla-form.css',
})
export class PlantillaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(AccountingTemplateService);
  readonly pucService = inject(PucAccountService);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly editId = signal<string | null>(null);

  readonly moduleOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'SALE', label: 'Ventas' },
    { value: 'PURCHASE', label: 'Compras' },
  ];

  readonly eventTypeLabels = EVENT_TYPE_LABELS;

  readonly eventTypeKeys: string[] = Object.keys(EVENT_TYPE_LABELS);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    module: ['SALE' as string, [Validators.required]],
    isDefault: [false],
    isActive: [true],
    entries: this.fb.array<FormGroup>([]),
  });

  get entriesArray(): FormArray<FormGroup> {
    return this.form.get('entries') as FormArray<FormGroup>;
  }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.loadTemplate(id);
    }
  }

  private loadTemplate(id: string): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (template) => {
        this.form.patchValue({
          code: template.code,
          name: template.name,
          description: template.description ?? '',
          module: template.module,
          isDefault: template.isDefault,
          isActive: template.isActive,
        });

        // Populate entries
        const entriesArray = this.entriesArray;
        entriesArray.clear();
        for (const entry of template.entries) {
          entriesArray.push(this.createEntryGroup(entry));
        }

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar la plantilla.');
      },
    });
  }

  private createEntryGroup(existing?: AccountingTemplateEntryRequest): FormGroup {
    return this.fb.group({
      eventType: [existing?.eventType ?? '', [Validators.required]],
      accountId: [existing?.accountId ?? '', [Validators.required]],
      isDebit: [existing?.isDebit ?? true],
      priority: [existing?.priority ?? 0, [Validators.required, Validators.min(0)]],
    });
  }

  addEntry(): void {
    this.entriesArray.push(this.createEntryGroup());
  }

  removeEntry(index: number): void {
    this.entriesArray.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const body = {
      code: v.code,
      name: v.name,
      description: v.description || null,
      module: v.module,
      isDefault: v.isDefault,
      isActive: v.isActive,
      entries: v.entries.map((e: Record<string, unknown>) => ({
        eventType: e['eventType'] as string,
        accountId: e['accountId'] as string,
        isDebit: e['isDebit'] as boolean,
        priority: e['priority'] as number,
      })),
    };

    this.saving.set(true);
    this.error.set(null);

    if (this.isEdit()) {
      this.service.update(this.editId()!, body).subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Plantilla actualizada',
            confirmButtonColor: '#15803d',
          }).then(() => {
            this.router.navigate(['/administracion/plantillas']);
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al actualizar la plantilla.';
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
            title: 'Plantilla creada',
            confirmButtonColor: '#15803d',
          }).then(() => {
            this.router.navigate(['/administracion/plantillas']);
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al crear la plantilla.';
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

  getPucAccountDisplay(accountId: string): string {
    const accounts = this.pucService.accounts.value() ?? [];
    const found = accounts.find((a) => a.id === accountId);
    return found ? `${found.code} — ${found.name}` : accountId;
  }
}
