import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { signal } from '@angular/core';
import { CatalogService } from '../../../../core/services/catalog.service';
import { IdentificationType } from '../../../../core/models/identification-type.model';

export interface QuickCreateIdTypeData { initialCode: string }

@Component({
  selector: 'app-quick-create-id-type-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatCheckboxModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    DragDropModule,
  ],
  template: `
    <div cdkDrag cdkDragRootElement=".cdk-overlay-pane">
      <h2 mat-dialog-title cdkDragHandle class="qcd-title">
        <mat-icon>add_circle</mat-icon>
        Crear tipo de identificación
      </h2>

      <mat-dialog-content class="qcd-content">
        <form [formGroup]="form">
          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Código * (ej: CC, NIT, CE)</mat-label>
            <input matInput formControlName="code" maxlength="10" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="qcd-field">
            <mat-label>Nombre *</mat-label>
            <input matInput formControlName="name" maxlength="100" />
          </mat-form-field>

          <mat-checkbox formControlName="requiresDv" class="qcd-checkbox">
            Requiere dígito de verificación (DV)
          </mat-checkbox>
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
    .qcd-content  { min-width: 340px; padding-top: 8px !important; }
    .qcd-field    { width: 100%; }
    .qcd-checkbox { display: block; margin-bottom: 4px; }
    .qcd-error    { color: #dc2626; font-size: 12px; margin: 8px 0 0; }
  `],
})
export class QuickCreateIdTypeDialogComponent {
  private readonly dialogRef      = inject(MatDialogRef<QuickCreateIdTypeDialogComponent>);
  private readonly data           = inject<QuickCreateIdTypeData>(MAT_DIALOG_DATA);
  private readonly catalogService = inject(CatalogService);
  private readonly fb             = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error  = signal<string | null>(null);

  readonly form = this.fb.group({
    code:       [this.data?.initialCode ?? '', [Validators.required, Validators.maxLength(10)]],
    name:       ['', [Validators.required, Validators.maxLength(100)]],
    requiresDv: [false],
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set(null);
    this.catalogService.createIdentificationType({
      code:       this.form.value.code!,
      name:       this.form.value.name!,
      requiresDv: this.form.value.requiresDv ?? false,
    }).subscribe({
      next: (idType: IdentificationType) => {
        this.saving.set(false);
        this.catalogService.reloadIdentificationTypes();
        this.dialogRef.close(idType);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Error al crear el tipo de identificación.');
      },
    });
  }

  close(): void { this.dialogRef.close(); }
}
