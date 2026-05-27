import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    if (this.auth.isAdmin()) {
      return true;
    }
    this.router.navigate(['/user/dashboard']);
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class EmployeeGuard {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    if (this.auth.isLoggedIn() && !this.auth.isAdmin()) {
      return true;
    }
    this.router.navigate(['/admin/dashboard']);
    return false;
  }
}