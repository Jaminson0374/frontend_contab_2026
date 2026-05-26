import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { RoleService } from '../../../core/services/role.service';
import { RoleResponse } from '../../../core/models/user.model';

@Component({
  selector: 'app-role-list',
  imports: [DatePipe, MatTableModule, MatCardModule, MatProgressSpinnerModule, MatChipsModule],
  templateUrl: './role-list.html',
  styleUrl: './role-list.css',
})
export class RoleListComponent {
  private readonly roleService = inject(RoleService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly roles = signal<RoleResponse[]>([]);

  readonly displayedColumns = ['name', 'permissions', 'createdAt'];

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

  formatPermissions(permissionsJson: string): string {
    try {
      const parsed = JSON.parse(permissionsJson);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed as Record<string, string[]>)
          .map(([key, value]) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            return `${label}: ${Array.isArray(value) ? value.join(', ') : value}`;
          })
          .join('\n');
      }
      return permissionsJson;
    } catch {
      return permissionsJson;
    }
  }
}
