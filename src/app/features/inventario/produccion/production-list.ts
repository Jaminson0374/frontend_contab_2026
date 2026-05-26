import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { ProductionBatch } from '../../../core/models/product-formula.model';

@Component({
  selector: 'app-production-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './production-list.html',
  styleUrl: './production-list.css',
})
export class ProductionListComponent {
  readonly batches = signal<ProductionBatch[]>([]);
  readonly loading = signal(false);
  readonly displayedColumns = [
    'createdAt',
    'formulaId',
    'quantityProduced',
    'totalCost',
    'unitCost',
    'actions',
  ];
}
