import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MachineryService } from '../../../core/services/machinery.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-machinery-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './machinery-form.html',
  styles: [
    '.mf-page{max-width:600px;margin:0 auto;padding:1rem} .mf-title{font-size:1.25rem;font-weight:600;margin-bottom:1rem} .mf-form{display:flex;flex-direction:column;gap:1rem} .mf-actions{display:flex;gap:.5rem;justify-content:flex-end}',
  ],
})
export class MachineryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MachineryService);
  readonly saving = signal(false);

  readonly typeOptions = [
    { value: 'MOLINO', label: 'Molino' },
    { value: 'MEZCLADORA', label: 'Mezcladora' },
    { value: 'EMBUTIDORA', label: 'Embutidora' },
    { value: 'AHUMADOR', label: 'Ahumador' },
    { value: 'EMPACADORA', label: 'Empacadora' },
    { value: 'SELLADORA', label: 'Selladora' },
    { value: 'BASCULA', label: 'Báscula' },
    { value: 'OTHER', label: 'Otro' },
  ];

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    machineryType: ['MOLINO' as string, Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.service.create({ code: v.code, name: v.name, machineryType: v.machineryType }).subscribe({
      next: () => {
        this.saving.set(false);
        Swal.fire({ icon: 'success', title: 'Equipo creado', confirmButtonColor: '#15803d' });
        this.form.reset({ machineryType: 'MOLINO' });
      },
      error: () => this.saving.set(false),
    });
  }
}
