import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../../core/services/user.service';
import { RoleService } from '../../../core/services/role.service';
import { RoleResponse, UserResponse } from '../../../core/models/user.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-form',
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
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly editId = signal<string | null>(null);
  readonly roles = signal<RoleResponse[]>([]);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    roleId: ['', [Validators.required]],
    isActive: [true],
  });

  constructor() {
    this.loadRoles();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
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
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          roleId: user.role.id,
          isActive: user.isActive,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar el usuario.');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const body = {
      username: v.username,
      fullName: v.fullName,
      email: v.email,
      roleId: v.roleId,
      isActive: v.isActive,
    };

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
          }).then(() => {
            this.router.navigate(['/administracion/usuarios']);
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al actualizar el usuario.';
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
      this.userService.create(body).subscribe({
        next: (res) => {
          this.saving.set(false);
          const tempPwd = res.tempPassword;
          const msg = tempPwd
            ? `Usuario creado.<br><br><strong>Contraseña temporal:</strong><br><code style="font-size:1.2rem;background:#f1f5f9;padding:4px 8px;border-radius:4px;">${tempPwd}</code><br><br>Guárdala, no se mostrará de nuevo.`
            : 'Usuario creado exitosamente.';
          Swal.fire({
            icon: 'success',
            title: 'Usuario creado',
            html: msg,
            confirmButtonColor: '#15803d',
          }).then(() => {
            this.router.navigate(['/administracion/usuarios']);
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message ?? 'Error al crear el usuario.';
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
}
