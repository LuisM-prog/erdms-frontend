import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserSidebarComponent } from '../../../components/user-sidebar/user-sidebar.component';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, UserSidebarComponent],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css'
})
export class UserProfileComponent implements OnInit {
  // User Data
  loggedInUser: any = null;
  userPosition: string = 'Employee';
  profilePicture: string = '';
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
        this.userPosition = this.loggedInUser.role_name === 'admin' ? 'Administrator' : 'Employee';
      }
    } catch (error) {
      this.errorMessage = 'Failed to load profile';
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  loadProfilePicture() {
    const savedPicture = localStorage.getItem(`profile_pic_${this.auth.currentUser()?.user_id}`);
    if (savedPicture) {
      this.profilePicture = savedPicture;
      this.profilePicturePreview = savedPicture;
    } else {
      // Generate initial avatar
      const initial = this.loggedInUser?.name?.charAt(0).toUpperCase() || 'U';
      this.profilePicture = initial;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.errorMessage = 'Profile picture must be less than 2MB';
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select an image file (JPEG, PNG, GIF)';
        return;
      }
      
      this.profilePictureFile = file;
      
      // Create preview
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
      // Convert to base64 and save to localStorage
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64 = e.target.result;
        const userId = this.auth.currentUser()?.user_id;
        localStorage.setItem(`profile_pic_${userId}`, base64);
        this.profilePicture = base64;
        this.profilePicturePreview = base64;
        this.successMessage = 'Profile picture updated successfully!';
        this.profilePictureFile = null;
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
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
    localStorage.removeItem(`profile_pic_${userId}`);
    const initial = this.loggedInUser?.name?.charAt(0).toUpperCase() || 'U';
    this.profilePicture = initial;
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
    return this.getRandomColor(this.loggedInUser?.name || 'User');
  }


  navigateToDocuments() {
    this.router.navigate(['/user/document-management']);
  }

  navigateToDashboard() {
  this.router.navigate(['/user/dashboard']);
}

  executeSignOut() {
    if (confirm('Are you sure you want to log out?')) {
      this.auth.logout();
    }
  }
}