import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.model';
import { UserResponse, UserRequest } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = '/api/v1/admin/users';

  readonly page = signal(0);
  readonly size = signal(20);
  readonly search = signal('');
  readonly roleFilter = signal('');
  readonly activeFilter = signal<boolean | null>(null);

  private buildParams(): string {
    const params = new URLSearchParams({
      page: `${this.page()}`,
      size: `${this.size()}`,
    });

    const s = this.search();
    if (s) params.set('search', s);

    const r = this.roleFilter();
    if (r) params.set('role', r);

    const a = this.activeFilter();
    if (a !== null) params.set('active', `${a}`);

    return params.toString();
  }

  readonly users = httpResource<PageResponse<UserResponse>>(() => {
    if (!isPlatformBrowser(this.platformId)) return undefined;
    return `${this.base}?${this.buildParams()}`;
  });

  create(body: UserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.base, body);
  }

  update(id: string, body: UserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.base}/${id}`, body);
  }

  getById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.base}/${id}`);
  }

  reload(): void {
    this.users.reload();
  }
}
