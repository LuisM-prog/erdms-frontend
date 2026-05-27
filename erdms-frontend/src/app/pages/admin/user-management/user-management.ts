import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/backend-models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.css']
})
export class UserManagementComponent implements OnInit {
  showCreateModal = false;
  isEditing = false;
  editingUserUid: number | null = null;
  
  searchQuery = '';
  filterRoles: { [key: number]: boolean } = {
    1: true,  // Admin
    2: true   // Employees
  };

  inputUsername = '';
  inputFullName = ''; 
  inputEmail = '';
  inputPassword = '';
  selectedRoleId = 2;  // Default to employees (role_id = 2)
  
  usersList: User[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router, 
    private state: StateService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.usersList = await this.state.getAllUsers();
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load users';
      console.error('Error loading users:', error);
    } finally {
      this.isLoading = false;
    }
  }

  get filteredUsersList(): User[] {
    return this.usersList.filter(user => {
      const nameMatch = user.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const emailMatch = user.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesSearch = nameMatch || emailMatch;
      const matchesRole = this.filterRoles[user.role_id] === true;
      return matchesSearch && matchesRole;
    });
  }

  displayRoleNameMapping(roleId: number): string {
    return roleId === 1 ? 'Administrator' : 'Employee';
  }

  getRoleBadgeClass(roleId: number): string {
    return roleId === 1 ? 'role-badge-admin' : 'role-badge-employee';
  }

  // Navigation Handlers
  navToDashboard() { this.router.navigate(['/admin/dashboard']); }
  navToDocManagement() { this.router.navigate(['/admin/folder-management']); }
  navToUserManagement() { this.router.navigate(['/admin/user-management']); }
  navToAuditLogs() { this.router.navigate(['/admin/audit-logs']); }

  executeSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      this.auth.logout();
    }
  }

  openCreateModal() {
    this.isEditing = false;
    this.resetForm();
    this.showCreateModal = true;
  }

  openEditModal(user: User) {
    this.isEditing = true;
    this.editingUserUid = user.user_id;
    this.inputFullName = user.name;
    this.inputEmail = user.email;
    this.inputPassword = '';
    this.selectedRoleId = user.role_id;
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.resetForm();
  }

  async submitNewAccount() {
    if (!this.inputFullName.trim() || !this.inputEmail.trim()) {
      alert('Full Name and Email are required fields.');
      return;
    }

    this.isLoading = true;

    if (this.isEditing && this.editingUserUid !== null) {
      // Update existing user
      const updateData: any = {};
      if (this.inputFullName.trim() !== '') updateData.name = this.inputFullName.trim();
      if (this.inputEmail.trim() !== '') updateData.email = this.inputEmail.trim();
      if (this.selectedRoleId !== undefined) updateData.role_id = this.selectedRoleId;
      
      const success = await this.state.updateUser(this.editingUserUid, updateData);
      if (success) {
        alert('User updated successfully!');
        await this.loadUsers();
        this.closeCreateModal();
      } else {
        alert('Failed to update user. Please try again.');
      }
    } else {
      // Create new user
      const result = await this.state.createUser({
        name: this.inputFullName.trim(),
        email: this.inputEmail.trim(),
        role_id: this.selectedRoleId as 1 | 2
      });
      
      if (result && result.temporary_password) {
        alert(`User created successfully!\n\nTemporary Password: ${result.temporary_password}\n\nPlease provide this password to the user. They should change it after first login.`);
        await this.loadUsers();
        this.closeCreateModal();
      } else {
        alert('Failed to create user. Please try again.');
      }
    }
    this.isLoading = false;
  }

  async toggleUserStatus(user: User) {
    if (user.user_id === this.auth.currentUser()?.user_id) {
      alert('Security Exception: You cannot deactivate your own account.');
      return;
    }
    
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const success = await this.state.toggleUserStatus(user.user_id, newStatus);
    
    if (success) {
      alert(`User ${user.name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
      await this.loadUsers();
    } else {
      alert('Failed to change user status. Please try again.');
    }
  }

  async resetUserPassword(user: User) {
    if (confirm(`Reset password for "${user.name}"? A new temporary password will be generated.`)) {
      const result = await this.state.resetUserPassword(user.user_id);
      if (result && result.temporary_password) {
        alert(`Password reset successful!\n\nNew Temporary Password: ${result.temporary_password}\n\nPlease provide this to the user.`);
      } else {
        alert('Failed to reset password. Please try again.');
      }
    }
  }

  async removeUserAccount(user: User) {
    if (user.user_id === this.auth.currentUser()?.user_id) {
      alert('Operation Denied: You cannot delete your own account.');
      return;
    }
    
    if (confirm(`Are you sure you want to permanently delete "${user.name}"? This action cannot be undone.`)) {
      const success = await this.state.deleteUser(user.user_id);
      if (success) {
        alert(`User "${user.name}" has been removed from the system.`);
        await this.loadUsers();
      } else {
        alert('Failed to delete user. Please try again.');
      }
    }
  }

  private resetForm() {
    this.inputFullName = '';
    this.inputEmail = '';
    this.inputPassword = '';
    this.selectedRoleId = 2;
    this.editingUserUid = null;
  }
}