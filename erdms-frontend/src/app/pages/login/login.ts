import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { EmailValidationService } from '../../services/email-validation.service';

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
  emailError = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private emailValidation: EmailValidationService
  ) {}

  onEmailInput() {
    this.emailError = this.emailValidation.getEmailValidationError(this.loginEmail) || '';
  }

  async executeAuthentication() {
    const email = this.loginEmail.trim();
    const password = this.loginPassword.trim();

    // Validate email format
    const emailError = this.emailValidation.getEmailValidationError(email);
    if (emailError) {
      this.errorMessage = emailError;
      return;
    }

    if (!password) {
      this.errorMessage = 'Password is required';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await this.authService.login(email, password);
      
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