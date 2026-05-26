import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface ProductImageUploadResponse {
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ProductImageUploadService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/uploads/products/images';

  upload(file: File): Observable<ProductImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ProductImageUploadResponse>(this.base, formData);
  }
}
