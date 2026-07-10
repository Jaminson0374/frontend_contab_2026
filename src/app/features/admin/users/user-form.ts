import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../../core/services/user.service';
import { RoleService } from '../../../core/services/role.service';
import { ThirdPartyService } from '../../../core/services/third-party.service';
import { RoleResponse, UserResponse, EmployeeOption } from '../../../core/models/user.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  readonly thirdPartyService = inject(ThirdPartyService);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly editId = signal<string | null>(null);
  readonly roles = signal<RoleResponse[]>([]);

  // ── Employee autocomplete ─────────────────────────────────────────
  readonly employeeDisplay = new FormControl('', { nonNullable: true });
  readonly employees = computed(() => this.thirdPartyService.employeeOptions.value() ?? []);

  readonly form = this.fb.nonNullable.group({
    employeeId: ['', [Validators.required]],
    email: ['', [Validators.email, Validators.maxLength(200)]],
    roleId: ['', [Validators.required]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.loadRoles();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.form.controls.employeeId.disable();
      this.loadUser(id);
    }
  }

  private loadRoles(): void {
    this.roleService.listAll().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.error.set('Error al cargar los roles.'),
    });
  }

  private loadUser(id: string): void {
    this.loading.set(true);
    this.userService.getById(id).subscribe({
      next: (user) => {
        this.form.patchValue({
          employeeId: user.employeeId ?? '',
          email: user.email,
          roleId: user.role.id,
          isActive: user.isActive,
        });
        // Sync display text
        this.syncEmployeeDisplay();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar el usuario.');
      },
    });
  }

  // ── Employee autocomplete handlers ────────────────────────────────

  onEmployeeSelected(ev: MatAutocompleteSelectedEvent): void {
    this.form.controls.employeeId.setValue(ev.option.value);
    this.employeeDisplay.setValue(ev.option.viewValue, { emitEvent: false });
  }

  syncEmployeeDisplay(): void {
    const id = this.form.controls.employeeId.getRawValue();
    const emp = this.employees().find((e) => e.id === id);
    this.employeeDisplay.setValue(emp ? this.employeeLabel(emp) : '', { emitEvent: false });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // If employeeId is disabled (edit mode), get raw value
    const employeeId = this.form.controls.employeeId.getRawValue();
    const email = this.form.controls.email.getRawValue();
    const roleId = this.form.controls.roleId.getRawValue();
    const isActive = this.form.controls.isActive.getRawValue();

    const body = { employeeId, email, roleId, isActive };

    this.saving.set(true);
    this.error.set(null);

    if (this.isEdit()) {
      this.userService.update(this.editId()!, body).subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Usuario actualizado',
            confirmButtonColor: '#15803d',
          }).then(() => this.router.navigate(['/administracion/usuarios']));
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al actualizar el usuario.';
          this.error.set(msg);
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#ef4444' });
        },
      });
    } else {
      this.userService.create(body).subscribe({
        next: () => {
          this.saving.set(false);
          Swal.fire({
            icon: 'success',
            title: 'Usuario creado',
            html: 'El usuario fue creado.<br><br>Se envió un email con el enlace para configurar su contraseña.',
            confirmButtonColor: '#15803d',
          }).then(() => this.router.navigate(['/administracion/usuarios']));
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al crear el usuario.';
          this.error.set(msg);
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#ef4444' });
        },
      });
    }
  }

  employeeLabel(emp: EmployeeOption): string {
    return `${emp.name} (${emp.numIdentification})`;
  }
}
