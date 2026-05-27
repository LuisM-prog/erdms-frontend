import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 401) {
      errorMessage = 'Session expired. Please login again.';
      localStorage.removeItem('access_token');
      localStorage.removeItem('current_user');
      window.location.href = '/login';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to perform this action';
    } else if (error.status === 404) {
      errorMessage = 'Resource not found';
    }
    return throwError(() => ({ status: error.status, message: errorMessage }));
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${endpoint}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${endpoint}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl}${endpoint}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  upload<T>(endpoint: string, formData: FormData): Observable<T> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    return this.http.post<T>(`${this.apiUrl}${endpoint}`, formData, { headers })
      .pipe(catchError(this.handleError));
  }

  download(endpoint: string): Observable<Blob> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    return this.http.get(`${this.apiUrl}${endpoint}`, { headers, responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }
}