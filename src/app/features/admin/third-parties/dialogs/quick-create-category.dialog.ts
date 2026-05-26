import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { signal } from '@angular/core';
import { ThirdPartyCategoryService } from '../../../../core/services/third-party-category.service';
import { ThirdPartyCategory } from '../../../../core/models/third-party-category.model';

export interface QuickCreateCategoryData { initialName: string }

@Component({
  selector: 'app-quick-create-category-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    DragDropModule,
  ],
  template: `
    <div cdkDrag cdkDragRootElement=".cdk-overlay-pane">
      <h2 mat-dialog-title cdkDragHandle class="qcd-title">
        <mat-icon>add_circle</mat-icon>
        Crear tipo de tercero
      </h2>

      <mat-dialog-content class="qcd-content">
        <form [formGroup]="form">
          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Nombre *</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Tipo base *</mat-label>
            <mat-select formControlName="baseType">
              <mat-option value="CLIENT">Cliente</mat-option>
              <mat-option value="SUPPLIER">Proveedor</mat-option>
              <mat-option value="EMPLOYEE">Empleado</mat-option>
              <mat-option value="BOTH">Todos</mat-option>
            </mat-select>
          </mat-form-field>
        </form>

        @if (error()) {
          <p class="qcd-error">{{ error() }}</p>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()" [disabled]="saving()">Cancelar</button>
        <button mat-flat-button color="primary" (click)="submit()"
                [disabled]="saving() || form.invalid">
          @if (saving()) {
            <mat-spinner diameter="16" />
          } @else {
            Crear
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .qcd-title {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: move;
      font-size: 15px;
      user-select: none;
    }
    .qcd-content { min-width: 340px; padding-top: 8px !important; }
    .qcd-field   { width: 100%; }
    .qcd-error   { color: #dc2626; font-size: 12px; margin: 4px 0 0; }
  `],
})
export class QuickCreateCategoryDialogComponent {
  private readonly dialogRef  = inject(MatDialogRef<QuickCreateCategoryDialogComponent>);
  private readonly data       = inject<QuickCreateCategoryData>(MAT_DIALOG_DATA);
  private readonly catService = inject(ThirdPartyCategoryService);
  private readonly fb         = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);

  readonly form = this.fb.group({
    name:     [this.data?.initialName ?? '', Validators.required],
    baseType: ['CLIENT', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set(null);
    this.catService.create({
      name:     this.form.value.name!,
      baseType: this.form.value.baseType!,
    }).subscribe({
      next: (cat: ThirdPartyCategory) => {
        this.saving.set(false);
        this.catService.reload();
        this.dialogRef.close(cat);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Error al crear el tipo de tercero.');
      },
    });
  }

  close(): void { this.dialogRef.close(); }
}
