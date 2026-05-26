import { Component } from '@angular/core';
import { PriceListListComponent } from '../../inventario/prices/price-list-list/price-list-list';

@Component({
  selector: 'app-price-list-admin',
  imports: [PriceListListComponent],
  template: '<app-price-list-list />',
})
export class PriceListAdminComponent {}
