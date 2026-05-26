import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DianService } from '../../../core/services/dian.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-certificate-upload-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './certificate-upload-dialog.html',
  styleUrl: './certificate-upload-dialog.css',
})
export class CertificateUploadDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dianService = inject(DianService);
  private readonly dialogRef = inject(MatDialogRef<CertificateUploadDialogComponent>);

  readonly uploading = signal(false);
  private selectedFile: File | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    password: ['', Validators.required],
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
    }
  }

  upload(): void {
    if (!this.selectedFile || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.uploading.set(true);
    const v = this.form.getRawValue();
    this.dianService.uploadCertificate(this.selectedFile, v.password, v.name).subscribe({
      next: () => {
        this.uploading.set(false);
        Swal.fire('Subido', 'Certificado subido correctamente.', 'success');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.uploading.set(false);
        Swal.fire('Error', err?.error?.message ?? 'Error al subir certificado', 'error');
      },
    });
  }
}
