import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-reportes',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatTabsModule],
  template: `
    <div class="reportes-container p-4">
      <h1 class="text-2xl font-bold mb-4">Reportes</h1>
      <nav mat-tab-nav-bar [tabPanel]="tabPanel">
        <a
          mat-tab-link
          routerLink="/reportes/ventas"
          routerLinkActive
          #ventas="routerLinkActive"
          [active]="ventas.isActive"
          >Ventas</a
        >
        <a
          mat-tab-link
          routerLink="/reportes/clientes"
          routerLinkActive
          #clientes="routerLinkActive"
          [active]="clientes.isActive"
          >Clientes</a
        >
        <a
          mat-tab-link
          routerLink="/reportes/rentabilidad"
          routerLinkActive
          #rent="routerLinkActive"
          [active]="rent.isActive"
          >Rentabilidad</a
        >
        <a
          mat-tab-link
          routerLink="/reportes/financieros"
          routerLinkActive
          #fin="routerLinkActive"
          [active]="fin.isActive"
          >Financieros</a
        >
      </nav>
      <mat-tab-nav-panel #tabPanel>
        <router-outlet />
      </mat-tab-nav-panel>
    </div>
  `,
})
export class ReportesLayoutComponent {}
