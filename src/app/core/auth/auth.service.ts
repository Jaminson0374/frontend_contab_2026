import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { LoginResponse, User } from '../models/user.model';

const TOKEN_KEY = 'pos_token';
const USER_KEY  = 'pos_user';
const API       = 'http://localhost:8080/api/v1';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly platformId  = inject(PLATFORM_ID);
  private readonly isBrowser   = isPlatformBrowser(this.platformId);
  private readonly http        = inject(HttpClient);
  private readonly router      = inject(Router);

  private readonly _currentUser = signal<User | null>(this.loadUserFromStorage());

  readonly currentUser     = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly userRole        = computed(() => this._currentUser()?.role);

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(`${API}/auth/login`, { username, password }).pipe(
      tap(res => {
        const user: User = { id: res.userId, username, fullName: res.fullName, role: res.role };
        if (this.isBrowser) {
          localStorage.setItem(TOKEN_KEY, res.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        }
        this._currentUser.set(user);
      })
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  }

  private loadUserFromStorage(): User | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
