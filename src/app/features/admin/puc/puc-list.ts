import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PucAccountService } from '../../../core/services/puc-account.service';
import { PucAccount } from '../../../core/models/product-catalog.model';
import Swal from 'sweetalert2';

interface PucTreeNode {
  account: PucAccount;
  children: PucTreeNode[];
  expanded: boolean;
}

@Component({
  selector: 'app-puc-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './puc-list.html',
  styleUrl: './puc-list.css',
})
export class PucListComponent {
  readonly service = inject(PucAccountService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'expand',
    'code',
    'name',
    'level',
    'accountClass',
    'accountNature',
    'active',
    'actions',
  ];

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly allAccounts = signal<PucAccount[]>([]);
  readonly searchQuery = signal('');
  /** Bump this to trigger flatRows recomputation when a node is toggled */
  readonly toggleVersion = signal(0);

  /** Build tree root nodes (level 1, or accounts with no parent) */
  readonly rootNodes = computed(() => {
    const accounts = this.allAccounts();
    const query = this.searchQuery().toLowerCase().trim();

    // Filter if there's a search query
    let filtered = accounts;
    if (query) {
      filtered = accounts.filter(
        (a) => a.code.toLowerCase().includes(query) || a.name.toLowerCase().includes(query),
      );
    }

    // Build children map: parentCode → list of children
    const childrenMap = new Map<string | null, PucAccount[]>();
    for (const a of filtered) {
      const parent = a.parentCode || null;
      if (!childrenMap.has(parent)) childrenMap.set(parent, []);
      childrenMap.get(parent)!.push(a);
    }

    // Recursively build tree
    const buildTree = (parentCode: string | null): PucTreeNode[] => {
      const children = childrenMap.get(parentCode) || [];
      return children
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((account) => ({
          account,
          children: buildTree(account.code),
          expanded: true,
        }));
    };

    return buildTree(null);
  });

  /** Flatten tree into rows with indentation level for MatTable */
  readonly flatRows = computed(() => {
    // Read toggleVersion so this recomputes when a node is toggled
    this.toggleVersion();
    const result: { node: PucTreeNode; depth: number }[] = [];
    const flatten = (nodes: PucTreeNode[], depth: number) => {
      for (const node of nodes) {
        result.push({ node, depth });
        if (node.expanded && node.children.length > 0) {
          flatten(node.children, depth + 1);
        }
      }
    };
    flatten(this.rootNodes(), 0);
    return result;
  });

  readonly accountClassLabels: Record<number, string> = {
    1: 'Activo',
    2: 'Pasivo',
    3: 'Patrimonio',
    4: 'Ingresos',
    5: 'Gastos',
    6: 'Costos de venta',
    7: 'Costos de producción',
    8: 'Cuentas de orden deudoras',
    9: 'Cuentas de orden acreedoras',
  };

  constructor() {
    this.loadTree();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchQuery.set(value.trim());
      });
  }

  loadTree(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.tree().subscribe({
      next: (accounts) => {
        this.allAccounts.set(accounts);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el catálogo PUC.');
        this.loading.set(false);
      },
    });
  }

  toggleExpand(node: PucTreeNode): void {
    node.expanded = !node.expanded;
    // Bump version to trigger flatRows recomputation
    this.toggleVersion.update((v) => v + 1);
  }

  hasChildren(node: PucTreeNode): boolean {
    return node.children.length > 0;
  }

  deactivateAccount(account: PucAccount): void {
    Swal.fire({
      title: '¿Desactivar cuenta?',
      html: `La cuenta <strong>${account.code} — ${account.name}</strong> será marcada como inactiva.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deactivate(account.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Cuenta desactivada',
              confirmButtonColor: '#15803d',
            });
            this.loadTree();
          },
          error: (err) => {
            const msg = err?.error?.message ?? 'Error al desactivar la cuenta.';
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
