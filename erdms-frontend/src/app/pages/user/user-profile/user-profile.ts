import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css'
})
export class UserProfileComponent implements OnInit {
  loggedInUser: any = null;
  userPosition: string = 'Employee';

  // Form bindings
  updatedName: string = '';
  updatedEmail: string = '';
  currentPasswordInput: string = '';
  newPasswordInput: string = '';
  confirmPasswordInput: string = '';

  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router, 
    private state: StateService,
    public auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  async loadProfile() {
    this.isLoading = true;
    try {
      this.loggedInUser = await this.state.getMyProfile();
      if (this.loggedInUser) {
        this.updatedName = this.loggedInUser.name;
        this.updatedEmail = this.loggedInUser.email;
        this.userPosition = this.loggedInUser.role_name === 'admin' ? 'Administrator' : 'Employee';
      }
    } catch (error) {
      this.errorMessage = 'Failed to load profile';
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  async saveProfileChanges() {
    if (!this.updatedName.trim() || !this.updatedEmail.trim()) {
      alert('Full Name and Email address fields cannot be left empty.');
      return;
    }

    this.isLoading = true;
    const success = await this.state.updateMyProfile({
      name: this.updatedName.trim(),
      email: this.updatedEmail.trim()
    });

    if (success) {
      alert('Your profile details have been successfully updated.');
      await this.loadProfile();
    } else {
      alert('Failed to update profile. Please try again.');
    }
    this.isLoading = false;
  }

  async changeUserPassword() {
    if (!this.currentPasswordInput || !this.newPasswordInput || !this.confirmPasswordInput) {
      alert('Please complete all password fields to update security credentials.');
      return;
    }

    if (this.newPasswordInput !== this.confirmPasswordInput) {
      alert('Your new password and confirmation password do not match.');
      return;
    }

    if (this.newPasswordInput.length < 6) {
      alert('For better security, your new password should be at least 6 characters long.');
      return;
    }

    this.isLoading = true;
    const success = await this.state.changeMyPassword(
      this.currentPasswordInput,
      this.newPasswordInput
    );

    if (success) {
      alert('Your account security password has been changed successfully!');
      this.currentPasswordInput = '';
      this.newPasswordInput = '';
      this.confirmPasswordInput = '';
    } else {
      alert('Failed to change password. Please check your current password and try again.');
    }
    this.isLoading = false;
  }

  navigateToTab(routePath: string): void {
    this.router.navigate([routePath]);
  }

  executeSignOut(): void {
    if (confirm('Are you sure you want to terminate this active session?')) {
      this.auth.logout();
    }
  }
}