import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RoleResponse } from '../../../../core/models/user.model';
import { RoleService } from '../../../../core/services/role.service';
import Swal from 'sweetalert2';

export interface RoleEditDialogData {
  role: RoleResponse;
}

const PERMISSION_MODULES = [
  { key: '*.*', label: 'Admin Total (acceso a todo)', dangerous: true },
  { key: 'sales.*', label: 'Ventas — Acceso total' },
  { key: 'sales.read', label: 'Ventas — Solo lectura' },
  { key: 'inventory.*', label: 'Inventario — Acceso total' },
  { key: 'inventory.read', label: 'Inventario — Solo lectura' },
  { key: 'purchases.*', label: 'Compras — Acceso total' },
  { key: 'purchases.read', label: 'Compras — Solo lectura' },
  { key: 'production.*', label: 'Producción — Acceso total' },
  { key: 'logistics.*', label: 'Logística — Acceso total' },
  { key: 'logistics.receive', label: 'Logística — Recepciones' },
  { key: 'reports.*', label: 'Reportes — Acceso total' },
  { key: 'finance.*', label: 'Finanzas — Acceso total' },
  { key: 'accounting.*', label: 'Contabilidad — Acceso total' },
];

@Component({
  selector: 'app-role-edit-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  templateUrl: './role-edit-dialog.html',
  styleUrl: './role-edit-dialog.css',
})
export class RoleEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<RoleEditDialogComponent>);
  readonly data = inject<RoleEditDialogData>(MAT_DIALOG_DATA);
  private readonly roleService = inject(RoleService);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly modules = PERMISSION_MODULES;

  // Parse permissions JSON into a Set
  private parsePermissions(permissionsJson: string): Set<string> {
    try {
      const arr: string[] = JSON.parse(permissionsJson);
      return new Set(arr);
    } catch {
      return new Set();
    }
  }

  // Build form with checkboxes based on current permissions
  readonly currentPerms = this.parsePermissions(this.data.role.permissions);
  readonly checkboxes = this.modules.map((m) => ({
    ...m,
    checked: this.currentPerms.has(m.key),
  }));

  readonly form = this.fb.nonNullable.group(
    Object.fromEntries(this.modules.map((m) => [m.key, [this.currentPerms.has(m.key)]])),
  );

  save(): void {
    const selected = this.modules.filter((m) => this.form.controls[m.key]?.value).map((m) => m.key);

    if (selected.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin permisos',
        text: 'Seleccioná al menos un permiso.',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    this.saving.set(true);
    this.roleService.update(this.data.role.id, JSON.stringify(selected)).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Error al guardar los permisos.';
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
