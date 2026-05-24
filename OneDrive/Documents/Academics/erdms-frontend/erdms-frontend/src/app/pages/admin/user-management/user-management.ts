import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService, User } from '../../../services/state';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css'
})
export class UserManagementComponent implements OnInit {
  showCreateModal = false;
  isEditing = false;
  editingUserUid: number | null = null;
  
  // LIVE FILTERS / INTERACTION STATE BINDINGS
  searchQuery = '';
  filterRoles: { [key: number]: boolean } = {
    1: true, // Admin
    2: true, // Manager
    3: true, // Standard User
    4: true  // Auditor
  };

  // UI Form Input Model Properties
  inputUsername = '';
  inputFullName = ''; 
  inputEmail = '';
  inputPassword = '';
  selectedRoleId = 3; 

  constructor(private router: Router, public state: StateService) {}

  ngOnInit(): void {
    // 👥 REMOVED DEFAULT MOCK USERS: Array initializes clean.
    // Preserves only the active running admin context to prevent locking out your active session.
    if (!this.state.usersTable || this.state.usersTable.length === 0) {
      const activeAdminUID = this.state.currentUserUID || 1;
      this.state.usersTable = [
        {
          UID: activeAdminUID,
          name: 'Administrator',
          email: 'admin@erdms.internal',
          password: 'password123',
          role_id: 1, // Administrator role definition requirement code matching routing hooks
          status: 'Active',
          created_at: new Date().toLocaleDateString()
        }
      ];
    }
  }

  // Direct source data array stream accessor
  get usersList(): User[] {
    return this.state.usersTable || [];
  }

  // Combined text lookup query evaluation + role matrix validation lookup rule filtering
  get filteredUsersList(): User[] {
    return this.usersList.filter(user => {
      const nameMatch = user.name ? user.name.toLowerCase().includes(this.searchQuery.toLowerCase()) : false;
      const emailMatch = user.email ? user.email.toLowerCase().includes(this.searchQuery.toLowerCase()) : false;
      const matchesSearch = nameMatch || emailMatch;
      const matchesRole = this.filterRoles[user.role_id] === true;
      return matchesSearch && matchesRole;
    });
  }

  displayRoleNameMapping(roleId: number): string {
    return this.state.getRoleName(roleId);
  }

  // Navigation handlers 
  navToDashboard() { this.router.navigate(['/admin/dashboard']); }
  navToDocManagement() { this.router.navigate(['/admin/folder-management']); }
  navToUserManagement() { this.router.navigate(['/admin/user-management']); }
  navToAuditLogs() { this.router.navigate(['/admin/audit-logs']); }

  executeSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      this.router.navigate(['/login']);
    }
  }

  // --- ACTIONS SYSTEM WORKING FLOWS ---

  openCreateModal() {
    this.isEditing = false;
    this.resetForm();
    this.showCreateModal = true;
  }

  openEditModal(user: User) {
    this.isEditing = true;
    this.editingUserUid = user.UID;
    
    this.inputUsername = user.email ? user.email.split('@')[0] : '';
    this.inputFullName = user.name;
    this.inputEmail = user.email;
    this.inputPassword = user.password || '';
    this.selectedRoleId = user.role_id;
    
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.resetForm();
  }

  submitNewAccount() {
    if (!this.inputFullName.trim() || !this.inputEmail.trim() || !this.inputPassword.trim()) {
      alert('Full Name, Email, and Password are required fields.');
      return;
    }

    if (this.isEditing && this.editingUserUid !== null) {
      const userRecord = this.state.usersTable.find(u => u.UID === this.editingUserUid);
      if (userRecord) {
        userRecord.name = this.inputFullName.trim();
        userRecord.email = this.inputEmail.trim();
        userRecord.password = this.inputPassword.trim();
        userRecord.role_id = Number(this.selectedRoleId);
        
        this.state.writeLogEntry(this.state.currentUserUID, `Updated details and roles for user UID: #${userRecord.UID}`);
      }
    } else {
      const nextUID = this.state.usersTable.length > 0 
        ? Math.max(...this.state.usersTable.map(u => u.UID)) + 1 
        : 1;
      
      this.state.usersTable.push({
        UID: nextUID,
        name: this.inputFullName.trim(),
        email: this.inputEmail.trim(),
        password: this.inputPassword.trim(),
        status: 'Active',
        role_id: Number(this.selectedRoleId),
        created_at: new Date().toLocaleDateString()
      });

      this.state.writeLogEntry(this.state.currentUserUID, `Provisioned new user record row: ${this.inputEmail.trim()}`);
    }

    this.state.persistDataChanges();
    this.closeCreateModal();
  }

  toggleUserStatus(user: User) {
    if (user.UID === this.state.currentUserUID) {
      alert('Security Exception: Active administrator profile session cannot be deactivated.');
      return;
    }
    user.status = user.status === 'Active' ? 'Deactivated' : 'Active';
    this.state.writeLogEntry(this.state.currentUserUID, `Altered status on user UID #${user.UID} to state: ${user.status}`);
    this.state.persistDataChanges();
  }

  removeUserAccount(user: User) {
    if (user.UID === this.state.currentUserUID) {
      alert('Operation Denied: Active administration profile account cannot be purged.');
      return;
    }
    if (confirm(`Are you completely certain you want to purge data record for user: "${user.name}"?`)) {
      this.state.usersTable = this.state.usersTable.filter(u => u.UID !== user.UID);
      this.state.writeLogEntry(this.state.currentUserUID, `Purged profile tracking metadata row for user: ${user.email}`);
      this.state.persistDataChanges();
    }
  }

  private resetForm() {
    this.inputUsername = '';
    this.inputFullName = '';
    this.inputEmail = '';
    this.inputPassword = '';
    this.selectedRoleId = 3;
    this.editingUserUid = null;
  }
}