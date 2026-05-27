import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css'
})
export class UserProfileComponent implements OnInit {
  public loggedInUser: any = null;
  public userPosition: string = 'Standard User';

  // Form bindings for updating personal info and passwords
  public updatedName: string = '';
  public updatedEmail: string = '';
  public currentPasswordInput: string = '';
  public newPasswordInput: string = '';
  public confirmPasswordInput: string = '';

  constructor(private router: Router, private state: StateService) {}

  ngOnInit(): void {
    const currentUID = this.state.currentUserUID || 3;

    if (this.state.usersTable) {
      this.loggedInUser = this.state.usersTable.find((u: any) => u.UID === currentUID) || null;
      
      if (this.loggedInUser) {
        this.updatedName = this.loggedInUser.name;
        this.updatedEmail = this.loggedInUser.email;
        
        // Map the read-only role string from state service definitions
        this.userPosition = this.state.getRoleName(this.loggedInUser.role_id) || 'Standard User';
      }
    }
  }

  // 💾 Updates permissible text attributes (Name and Email)
  saveProfileChanges(): void {
    if (!this.updatedName.trim() || !this.updatedEmail.trim()) {
      alert('Full Name and Email address fields cannot be left empty.');
      return;
    }

    this.loggedInUser.name = this.updatedName;
    this.loggedInUser.email = this.updatedEmail;

    // Log the event to global audit tracking
    this.state.writeLogEntry(this.loggedInUser.UID, `Updated personal profile parameters: Name/Email`);
    alert('Your profile details have been successfully updated.');
  }

  // 🔑 Secure Password Update Form Handler
  changeUserPassword(): void {
    if (!this.currentPasswordInput || !this.newPasswordInput || !this.confirmPasswordInput) {
      alert('Please complete all password fields to update security credentials.');
      return;
    }

    // Verify current security credentials match what's on file
    if (this.currentPasswordInput !== this.loggedInUser.password) {
      alert('The current password you entered is incorrect.');
      return;
    }

    if (this.newPasswordInput !== this.confirmPasswordInput) {
      alert('Your new password and confirmation password do not match.');
      return;
    }

    if (this.newPasswordInput.length < 4) {
      alert('For better security, your new password should be at least 4 characters long.');
      return;
    }

    // Commit password mutation directly to the global record state
    this.loggedInUser.password = this.newPasswordInput;
    
    // Write track footprint to central logs
    this.state.writeLogEntry(this.loggedInUser.UID, `Changed personal account password for security`);

    // Reset input states
    this.currentPasswordInput = '';
    this.newPasswordInput = '';
    this.confirmPasswordInput = '';

    alert('Your account security password has been changed successfully!');
  }

  // Standard tab routing navigation method to prevent TS2551 errors
  navigateToTab(routePath: string): void {
    this.router.navigate([routePath]);
  }

  executeSignOut(): void {
    if (confirm('Are you sure you want to terminate this active session?')) {
      this.router.navigate(['/login']);
    }
  }
}