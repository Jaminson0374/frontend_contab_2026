import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-administracion-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatTabsModule],
  templateUrl: './administracion-layout.html',
  styleUrl: './administracion-layout.css',
})
export class AdministracionLayoutComponent {
  readonly tabs = [
    { label: 'Usuarios y roles', route: '/administracion/usuarios' },
    { label: 'Empresa', route: '/administracion/empresa' },
    { label: 'PUC', route: '/administracion/puc' },
    { label: 'Plantillas contables', route: '/administracion/plantillas' },
    { label: 'Precios', route: '/administracion/precios' },
    { label: 'Auditoría', route: '/administracion/auditoria' },
  ];
}
