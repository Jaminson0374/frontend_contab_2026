import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { untracked } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import {
  DebitCreditNote,
  DebitCreditNoteRequest,
  NoteType,
} from '../models/debit-credit-note.model';

@Injectable({ providedIn: 'root' })
export class SupplierNoteService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/debit-credit-notes';

  readonly page = signal(0);
  readonly size = signal(20);
  readonly type = signal<NoteType | null>(null);
  readonly supplierId = signal<string | null>(null);

  private buildParams(): string {
    const params = new URLSearchParams({
      page: `${untracked(this.page)}`,
      size: `${untracked(this.size)}`,
    });
    const t = untracked(this.type);
    if (t) params.set('type', t);
    const sid = untracked(this.supplierId);
    if (sid) params.set('supplierId', sid);
    return params.toString();
  }

  readonly notes = httpResource<PageResponse<DebitCreditNote>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildParams()}`;
  });

  getById(id: string): Observable<DebitCreditNote> {
    return this.http.get<DebitCreditNote>(`${this.base}/${id}`);
  }

  create(request: DebitCreditNoteRequest): Observable<DebitCreditNote> {
    return this.http.post<DebitCreditNote>(this.base, request);
  }

  update(id: string, request: DebitCreditNoteRequest): Observable<DebitCreditNote> {
    return this.http.put<DebitCreditNote>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  reload(): void {
    this.notes.reload();
  }
}
