import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = 'http://localhost:8787/api/v1';

  private getAuthHeaders(isFormData: boolean = false): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    const headersConfig: any = {};
    
    if (!isFormData) {
      headersConfig['Content-Type'] = 'application/json';
    }
    
    if (token) {
      headersConfig['Authorization'] = `Bearer ${token}`;
    }
    
    return new HttpHeaders(headersConfig);
  }

  get<T>(url: string, params?: any): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${url}`, {
      headers: this.getAuthHeaders(),
      params: params
    }).pipe(
      catchError((error: any) => {
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  post<T>(url: string, body: any): Observable<T> {
    const isFormData = body instanceof FormData;
    return this.http.post<T>(`${this.baseUrl}${url}`, body, {
      headers: this.getAuthHeaders(isFormData)
    }).pipe(
      catchError((error: any) => {
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  patch<T>(url: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${url}`, body, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error: any) => {
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${url}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error: any) => {
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  private logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    this.router.navigate(['/login']);
  }
}
