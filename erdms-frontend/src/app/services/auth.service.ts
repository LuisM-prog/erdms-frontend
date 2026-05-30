import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from './http.service';
import { SessionService } from './session.service';
import { LoginResponse } from '../models/backend-models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpService);
  private router = inject(Router);
  private session = inject(SessionService);
  
  public currentUser = signal<any>(null);
  public isLoggedIn = signal<boolean>(false);
  public isAdmin = signal<boolean>(false);

  constructor() {
    this.loadStoredUser();
    
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (event) => {
      // Only react to changes from other tabs, not this one
      if (event.key?.includes(this.session.getTabId())) {
        this.loadStoredUser();
      }
    });
  }

  private loadStoredUser() {
    const user = this.session.getUser();
    const token = this.session.getToken();
    if (user && token) {
      this.currentUser.set(user);
      this.isLoggedIn.set(true);
      this.isAdmin.set(user.role === 'admin');
    } else {
      this.currentUser.set(null);
      this.isLoggedIn.set(false);
      this.isAdmin.set(false);
    }
  }

  login(email: string, password: string): Promise<LoginResponse> {
    return new Promise((resolve, reject) => {
      this.http.post<LoginResponse>('/auth/login', { email, password }).subscribe({
        next: (response) => {
          this.session.setToken(response.token);
          this.session.setUser(response.user);
          this.currentUser.set(response.user);
          this.isLoggedIn.set(true);
          this.isAdmin.set(response.user.role === 'admin');
          resolve(response);
        },
        error: reject
      });
    });
  }

  logout(): void {
    const userId = this.currentUser()?.user_id;
    if (userId) {
      this.http.post('/auth/logout', { user_id: userId }).subscribe({
        next: () => console.log('Logout logged'),
        error: () => console.log('Logout log failed')
      });
    }
    this.session.removeToken();
    this.session.removeUser();
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.isAdmin.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.session.getToken();
  }
}