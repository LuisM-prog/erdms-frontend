import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from './http.service';
import { LoginResponse } from '../models/backend-models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpService);
  private router = inject(Router);
  
  // Reactive state for current user
  public currentUser = signal<{ user_id: number; name: string; email: string; role: 'admin' | 'employees'; status: string } | null>(null);
  public isLoggedIn = signal<boolean>(false);
  public isAdmin = signal<boolean>(false);

  constructor() {
    this.loadStoredUser();
  }

  private loadStoredUser() {
    const storedUser = localStorage.getItem('current_user');
    const token = localStorage.getItem('access_token');
    if (storedUser && token) {
      const user = JSON.parse(storedUser);
      this.currentUser.set(user);
      this.isLoggedIn.set(true);
      this.isAdmin.set(user.role === 'admin');
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return new Promise((resolve, reject) => {
      this.http.post<LoginResponse>('/auth/login', { email, password }).subscribe({
        next: (response) => {
          localStorage.setItem('access_token', response.token);
          localStorage.setItem('current_user', JSON.stringify(response.user));
          this.currentUser.set(response.user);
          this.isLoggedIn.set(true);
          this.isAdmin.set(response.user.role === 'admin');
          // Backend already logs login, so no need to duplicate
          resolve(response);
        },
        error: reject
      });
    });
  }

  logout(): void {
    const userId = this.currentUser()?.user_id;
    if (userId) {
      // Send logout action to backend
      this.http.post('/auth/logout', { user_id: userId }).subscribe({
        next: () => console.log('Logout logged'),
        error: () => console.log('Logout log failed')
      });
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.isAdmin.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
}