import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { isPlatformBrowser, SlicePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { map } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import type { Animal, Species } from '../../../../core/models/animal.model';
import type { SlaughterRequest } from '../../../../core/models/slaughter.model';
import { SLAUGHTER_SOURCE_TYPE } from '../../../../core/models/slaughter.model';
import type { UserRole } from '../../../../core/models/user.model';
import { AnimalService } from '../../../../core/services/animal.service';
import { SlaughterService } from '../../../../core/services/slaughter.service';

const FAENA_ALLOWED_ROLE = {
  ADMIN: 'ADMIN',
  CARNICERO: 'CARNICERO',
} as const;

type FaenaAllowedRole = (typeof FAENA_ALLOWED_ROLE)[keyof typeof FAENA_ALLOWED_ROLE];

const speciesLabels: Record<Species, string> = {
  PORCINO: 'Porcino',
  BOVINO: 'Bovino',
  OVINO: 'Ovino',
};

@Component({
  selector: 'app-faena',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    SlicePipe,
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './faena.html',
  styleUrl: './faena.css',
})
export class FaenaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  readonly animalService = inject(AnimalService);
  private readonly slaughterService = inject(SlaughterService);

  readonly animalId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: '',
  });

  readonly animal = httpResource<Animal>(() => {
    const id = this.animalId();
    if (!id || !isPlatformBrowser(this.platformId)) return undefined;
    return `/api/v1/animals/${id}`;
  });

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    carcassWeight: [0, [Validators.required, Validators.min(0.001)]],
    purchaseCost: [0, [Validators.required, Validators.min(0.001)]],
    manualJustification: ['', [Validators.required, Validators.maxLength(500)]],
    notes: [''],
  });

  readonly yieldPct = computed(() => {
    const anim = this.animal.value();
    const carcass = this.form.controls.carcassWeight.getRawValue();
    if (!anim || !anim.liveWeight || !carcass) return 0;
    return (carcass / anim.liveWeight) * 100;
  });

  readonly yieldWarning = computed(() => {
    const yp = this.yieldPct();
    return yp > 0 && (yp < 50 || yp > 70);
  });

  readonly yieldClass = computed(() => {
    const anim = this.animal.value();
    if (!anim) return '';
    if (this.yieldWarning()) return 'yield-warning';
    return 'yield-ok';
  });

  readonly speciesLabel = computed(() => {
    const anim = this.animal.value();
    if (!anim) return '';
    return speciesLabels[anim.species] ?? anim.species;
  });

  readonly allowedToSubmit = computed(() => {
    const role = this.authService.userRole();
    return this.isRoleAllowed(role ?? null);
  });

  goBack(): void {
    this.router.navigate(['/inventario/animales']);
  }

  submit(): void {
    this.submitSuccess.set(null);
    this.submitError.set(null);

    if (!this.allowedToSubmit()) {
      this.submitError.set('Tu rol no tiene permisos para registrar faena.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const anim = this.animal.value();
    if (!anim) {
      this.submitError.set('No se pudo cargar la información del animal.');
      return;
    }

    const raw = this.form.getRawValue();

    if (raw.carcassWeight > anim.liveWeight) {
      this.submitError.set('El peso en canal no puede superar el peso vivo del animal.');
      return;
    }

    this.submitting.set(true);

    const request: SlaughterRequest = {
      animalId: anim.id,
      sourceType: SLAUGHTER_SOURCE_TYPE.MANUAL,
      manualJustification: raw.manualJustification.trim(),
      carcassWeight: raw.carcassWeight,
      purchaseCost: raw.purchaseCost,
      notes: raw.notes.trim() ? raw.notes.trim() : null,
    };

    this.slaughterService.process(request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitSuccess.set('Faena registrada correctamente.');
        this.animalService.reload();
        this.router.navigate(['/inventario/animales']);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.submitError.set(this.extractErrorMessage(err, 'No se pudo registrar la faena.'));
      },
    });
  }

  private isRoleAllowed(role: UserRole | null): role is FaenaAllowedRole {
    return role === FAENA_ALLOWED_ROLE.ADMIN || role === FAENA_ALLOWED_ROLE.CARNICERO;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error.trim();
      }

      if (error.error && typeof error.error === 'object') {
        const msg = (error.error as { message?: string }).message;
        if (typeof msg === 'string' && msg.trim()) {
          return msg.trim();
        }
      }

      if (error.message) {
        return error.message;
      }
    }

    return fallback;
  }
}
