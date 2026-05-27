import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  loginEmail = '';
  loginPassword = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async executeAuthentication() {
    const email = this.loginEmail.trim();
    const password = this.loginPassword.trim();

    if (!email || !password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await this.authService.login(email, password);
      
      // Role-based routing using backend's role_name
      if (response.user.role === 'admin') {
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.router.navigate(['/user/dashboard']);
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Login failed. Please check your credentials.';
      console.error('Login error:', error);
    } finally {
      this.isLoading = false;
    }
  }
}