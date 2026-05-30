import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.css']
})
export class AdminProfileComponent implements OnInit {
  loggedInUser: any = null;
  adminRole: string = 'Administrator';
  profilePicture: string | null = null;
  profilePictureFile: File | null = null;
  profilePicturePreview: string | null = null;
  
  // Edit Mode
  isEditing = false;
  isLoading = false;
  isUploading = false;
  errorMessage = '';
  successMessage = '';
  
  // Personal Information Form
  editedName = '';
  editedEmail = '';
  
  // Password Change Form
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private router: Router,
    private state: StateService,
    public auth: AuthService
  ) {}

  async ngOnInit() {
    await this.loadProfile();
    this.loadProfilePicture();
  }

  async loadProfile() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.loggedInUser = await this.state.getMyProfile();
      if (this.loggedInUser) {
        this.editedName = this.loggedInUser.name;
        this.editedEmail = this.loggedInUser.email;
      }
    } catch (error) {
      this.errorMessage = 'Failed to load profile';
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  loadProfilePicture() {
    const userId = this.auth.currentUser()?.user_id;
    if (userId) {
      const savedPicture = localStorage.getItem(`profile_pic_${userId}`);
      if (savedPicture && savedPicture.startsWith('data:image')) {
        this.profilePicture = savedPicture;
        this.profilePicturePreview = savedPicture;
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.errorMessage = 'Profile picture must be less than 2MB';
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select an image file (JPEG, PNG, GIF)';
        return;
      }
      
      this.profilePictureFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profilePicturePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadProfilePicture() {
    if (!this.profilePictureFile) return;
    
    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    try {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64 = e.target.result;
        const userId = this.auth.currentUser()?.user_id;
        if (userId) {
          localStorage.setItem(`profile_pic_${userId}`, base64);
          this.profilePicture = base64;
          this.profilePicturePreview = base64;
          this.successMessage = 'Profile picture updated successfully!';
          this.profilePictureFile = null;
          
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        }
      };
      reader.readAsDataURL(this.profilePictureFile);
    } catch (error) {
      this.errorMessage = 'Failed to upload profile picture';
    } finally {
      this.isUploading = false;
    }
  }

  removeProfilePicture() {
    const userId = this.auth.currentUser()?.user_id;
    if (userId) {
      localStorage.removeItem(`profile_pic_${userId}`);
    }
    this.profilePicture = null;
    this.profilePicturePreview = null;
    this.profilePictureFile = null;
    this.successMessage = 'Profile picture removed';
    
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.editedName = this.loggedInUser?.name || '';
      this.editedEmail = this.loggedInUser?.email || '';
    }
    this.errorMessage = '';
    this.successMessage = '';
  }

  async saveProfileChanges() {
    if (!this.editedName.trim() || !this.editedEmail.trim()) {
      this.errorMessage = 'Name and email cannot be empty';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const success = await this.state.updateMyProfile({
      name: this.editedName.trim(),
      email: this.editedEmail.trim()
    });

    if (success) {
      this.successMessage = 'Profile updated successfully!';
      await this.loadProfile();
      this.isEditing = false;
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } else {
      this.errorMessage = 'Failed to update profile. Email may already be in use.';
    }
    this.isLoading = false;
  }

  async changePassword() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.currentPassword) {
      this.errorMessage = 'Current password is required';
      return;
    }

    if (!this.newPassword) {
      this.errorMessage = 'New password is required';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'New password must be at least 6 characters';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'New password and confirmation do not match';
      return;
    }

    this.isLoading = true;

    const success = await this.state.changeMyPassword(
      this.currentPassword,
      this.newPassword
    );

    if (success) {
      this.successMessage = 'Password changed successfully!';
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } else {
      this.errorMessage = 'Current password is incorrect';
    }
    this.isLoading = false;
  }

  getRandomColor(name: string): string {
    const colors = [
      '#2563eb', '#10b981', '#f59e0b', '#ef4444', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getProfileBgColor(): string {
    return this.getRandomColor(this.loggedInUser?.name || 'Admin');
  }

  getProfilePicture(): string | null {
    return this.profilePicture;
  }

  getInitial(): string {
    return this.loggedInUser?.name?.charAt(0).toUpperCase() || 'A';
  }

  navigateToDashboard() {
    this.router.navigate(['/admin/dashboard']);
  }

  navigateToUserManagement() {
    this.router.navigate(['/admin/user-management']);
  }

  navigateToFolderManagement() {
    this.router.navigate(['/admin/folder-management']);
  }

  navigateToAuditLogs() {
    this.router.navigate(['/admin/audit-logs']);
  }

  navigateToAdminProfile() {
    this.router.navigate(['/admin/profile']);
  }

  executeSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      this.auth.logout();
    }
  }
}