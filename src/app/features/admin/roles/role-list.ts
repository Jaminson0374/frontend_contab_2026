import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RoleService } from '../../../core/services/role.service';
import { RoleResponse } from '../../../core/models/user.model';
import { RoleEditDialogComponent, RoleEditDialogData } from './role-edit-dialog/role-edit-dialog';

@Component({
  selector: 'app-role-list',
  imports: [
    DatePipe,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './role-list.html',
  styleUrl: './role-list.css',
})
export class RoleListComponent {
  private readonly roleService = inject(RoleService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly roles = signal<RoleResponse[]>([]);

  readonly displayedColumns = ['name', 'permissions', 'createdAt', 'actions'];

  constructor() {
    this.loadRoles();
  }

  private loadRoles(): void {
    this.loading.set(true);
    this.error.set(null);

    this.roleService.listAll().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al cargar los roles.');
      },
    });
  }

  openEditDialog(role: RoleResponse): void {
    const ref = this.dialog.open<RoleEditDialogComponent, RoleEditDialogData, boolean>(
      RoleEditDialogComponent,
      {
        width: '480px',
        data: { role },
      },
    );

    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadRoles();
      }
    });
  }

  formatPermissions(permissionsJson: string): string {
    try {
      const parsed = JSON.parse(permissionsJson);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
      return permissionsJson;
    } catch {
      return permissionsJson;
    }
  }
}
