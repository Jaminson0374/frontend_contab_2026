import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PriceList } from '../../../../core/models/product-catalog.model';
import { PriceListService } from '../../../../core/services/price-list.service';

export interface QuickCreatePriceListData {
  initialName?: string;
  priceList?: PriceList;
}

@Component({
  selector: 'app-quick-create-price-list-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DragDropModule,
  ],
  template: `
    <div cdkDrag cdkDragRootElement=".cdk-overlay-pane">
      <h2 mat-dialog-title cdkDragHandle class="qcd-title">
        <mat-icon>{{ isEditMode ? 'edit' : 'add_circle' }}</mat-icon>
        {{ isEditMode ? 'Editar lista de precios' : 'Crear lista de precios' }}
      </h2>

      <mat-dialog-content class="qcd-content">
        <form [formGroup]="form">
          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Código *</mat-label>
            <input matInput formControlName="code" maxlength="20" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Nombre *</mat-label>
            <input matInput formControlName="name" maxlength="100" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Descripción</mat-label>
            <textarea matInput formControlName="description" maxlength="255" rows="3"></textarea>
          </mat-form-field>
        </form>

        @if (error()) {
          <p class="qcd-error">{{ error() }}</p>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()" [disabled]="saving()">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          (click)="submit()"
          [disabled]="saving() || form.invalid"
        >
          @if (saving()) {
            <mat-spinner diameter="16" />
          } @else {
            {{ isEditMode ? 'Guardar cambios' : 'Crear' }}
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .qcd-title {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: move;
        font-size: 15px;
        user-select: none;
      }
      .qcd-content {
        min-width: 360px;
        padding-top: 8px !important;
      }
      .qcd-field {
        width: 100%;
      }
      .qcd-error {
        color: #dc2626;
        font-size: 12px;
        margin: 4px 0 0;
      }
    `,
  ],
})
export class QuickCreatePriceListDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuickCreatePriceListDialogComponent>);
  readonly data = inject<QuickCreatePriceListData>(MAT_DIALOG_DATA);
  private readonly service = inject(PriceListService);
  private readonly fb = inject(FormBuilder);

  readonly isEditMode = !!this.data?.priceList;

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    code: [this.data?.priceList?.code ?? '', [Validators.required, Validators.maxLength(20)]],
    name: [
      this.data?.priceList?.name ?? this.data?.initialName ?? '',
      [Validators.required, Validators.maxLength(100)],
    ],
    description: [this.data?.priceList?.description ?? '', Validators.maxLength(255)],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    const request$ =
      this.isEditMode && this.data.priceList
        ? this.service.update(
            this.data.priceList.id,
            value.code!,
            value.name!,
            value.description || undefined,
          )
        : this.service.create(value.code!, value.name!, value.description || undefined);

    request$.subscribe({
      next: (priceList: PriceList) => {
        this.saving.set(false);
        this.service.reload();
        this.dialogRef.close(priceList);
      },
      error: (err: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.error.set(
          err?.error?.message ??
            (this.isEditMode
              ? 'Error al actualizar la lista de precios.'
              : 'Error al crear la lista de precios.'),
        );
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
