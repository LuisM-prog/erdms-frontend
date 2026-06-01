import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class EmailValidationService {
  
  // Email regex pattern - RFC 5322 compliant
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Domain whitelist (optional - can be configured)
  private readonly ALLOWED_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'erdms.com', 'company.com'];
  
  // Validate email format
  isValidEmail(email: string): boolean {
    if (!email) return false;
    return this.EMAIL_REGEX.test(email);
  }
  
  // Check if domain is allowed (optional)
  isAllowedDomain(email: string): boolean {
    const domain = email.split('@')[1];
    if (!domain) return false;
    return this.ALLOWED_DOMAINS.includes(domain.toLowerCase());
  }
  
  // Get detailed validation error message
  getEmailValidationError(email: string): string | null {
    if (!email) return 'Email is required';
    if (!this.EMAIL_REGEX.test(email)) {
      return 'Please enter a valid email address (e.g., user@example.com)';
    }
    // Optional: uncomment to enforce domain whitelist
    // if (!this.isAllowedDomain(email)) {
    //   return `Email domain must be one of: ${this.ALLOWED_DOMAINS.join(', ')}`;
    // }
    return null;
  }
  
  // Angular Form Validator
  emailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const isValid = this.isValidEmail(control.value);
      return isValid ? null : { invalidEmail: { value: control.value } };
    };
  }
}