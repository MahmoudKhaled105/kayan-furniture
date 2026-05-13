import { Injectable, inject, signal } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError } from 'rxjs';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RegisterResponse {
  success: boolean;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly httpClient = inject(HttpClientService);
  private readonly router = inject(Router);

  user = signal<User | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.loadUserFromStorage();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.httpClient.post<LoginResponse>('/auth/login', { email, password }).pipe(
      tap((response) => {
        this.saveTokens(response.accessToken, response.refreshToken);
        this.user.set(response.user);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.error.set(err?.error?.message || 'فشل تسجيل الدخول');
        return throwError(() => err);
      })
    );
  }

  register(name: string, email: string, password: string): Observable<RegisterResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.httpClient.post<RegisterResponse>('/auth/register', { name, email, password }).pipe(
      tap((response) => {
        this.user.set(response.user);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.error.set(err?.error?.message || 'فشل إنشاء الحساب');
        return throwError(() => err);
      })
    );
  }

  logout(): Observable<void> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      return this.httpClient.post<void>('/auth/logout', { refreshToken }).pipe(
        tap(() => {
          this.clearSession();
        }),
        catchError(() => {
          this.clearSession();
          return of(void 0);
        })
      );
    } else {
      this.clearSession();
      return of(void 0);
    }
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      this.clearSession();
      this.router.navigate(['/login']);
      throw new Error('No refresh token');
    }

    return this.httpClient.post<LoginResponse>('/auth/refresh', { refreshToken }).pipe(
      tap((response) => {
        this.saveTokens(response.accessToken, response.refreshToken);
        this.user.set(response.user);
      }),
      catchError((err) => {
        this.clearSession();
        this.router.navigate(['/login']);
        return throwError(() => err);
      })
    );
  }

  getCurrentUser(): User | null {
    return this.user();
  }

  isLoggedIn(): boolean {
    return this.user() !== null && this.isTokenValid();
  }

  getCurrentUserId(): number | null {
    return this.user()?.id || null;
  }

  getCurrentUserRole(): string | null {
    return this.user()?.role || null;
  }

  isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }

  private saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem('tokenExpiry', expiry.toString());
  }

  private clearSession(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    this.user.set(null);
    this.error.set(null);
  }

  private isTokenValid(): boolean {
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    return tokenExpiry ? Date.now() < parseInt(tokenExpiry) : false;
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.user.set(user);
      } catch (err) {
        console.error('Failed to load user from storage', err);
      }
    }
  }
}
