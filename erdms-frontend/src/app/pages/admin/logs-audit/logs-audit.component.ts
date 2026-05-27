import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-logs-audit',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './logs-audit.component.html',
  styleUrl: './logs-audit.component.css'
})
export class LogsAuditComponent implements OnInit {
  searchQuery = '';
  selectedCategory = 'ALL';
  
  allLogs: any[] = [];
  isLoading = true;
  currentPage = 1;
  totalPages = 1;
  totalLogs = 0;

  constructor(
    private router: Router, 
    public state: StateService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  async loadLogs() {
    this.isLoading = true;
    try {
      const result = await this.state.getAllLogs({ 
        page: this.currentPage, 
        limit: 20 
      });
      this.allLogs = result.logs;
      this.totalPages = result.total_pages;
      this.totalLogs = result.total;
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      this.isLoading = false;
    }
  }

  get filteredAuditTrail(): any[] {
    let logs = this.allLogs;
    
    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      logs = logs.filter(log => {
        const actionText = this.getActionText(log).toLowerCase();
        const userName = (log.user_name || '').toLowerCase();
        return actionText.includes(query) || userName.includes(query);
      });
    }
    
    // Filter by category
    if (this.selectedCategory !== 'ALL') {
      logs = logs.filter(log => {
        if (this.selectedCategory === 'LOGIN') {
          return log.action === 'login' || log.action === 'logout';
        } else if (this.selectedCategory === 'TRANSFER') {
          return log.action === 'upload' || log.action === 'download';
        } else if (this.selectedCategory === 'ACCESS') {
          return log.action === 'edit' || log.action === 'delete';
        }
        return true;
      });
    }
    
    return logs;
  }

  getActionText(log: any): string {
    const actionMap: { [key: string]: string } = {
      'login': 'User Login',
      'logout': 'User Logout',
      'upload': 'Document Upload',
      'download': 'Document Download',
      'delete': 'Document Deletion',
      'edit': 'Document Edit',
      'create_user': 'Create User Account',
      'edit_user': 'Edit User Details',
      'delete_user': 'Delete User Account',
      'toggle_user_status': 'Toggle User Status',
      'reset_user_password': 'Reset User Password',
      'create_folder': 'Create New Folder',
      'edit_folder': 'Edit Folder Settings',
      'delete_folder': 'Delete Folder'
    };
    return actionMap[log.action] || log.action || 'System Action';
  }

  getCategoryBadgeClass(action: string): string {
    const loginActions = ['login', 'logout'];
    const transferActions = ['upload', 'download'];
    const userActions = ['create_user', 'edit_user', 'delete_user', 'toggle_user_status', 'reset_user_password'];
    const folderActions = ['create_folder', 'edit_folder', 'delete_folder'];
    
    if (loginActions.includes(action)) return 'badge-login';
    if (transferActions.includes(action)) return 'badge-transfer';
    if (userActions.includes(action)) return 'badge-user';
    if (folderActions.includes(action)) return 'badge-folder';
    return 'badge-access';
  }

getCategoryIcon(action: string): string {
  const iconMap: { [key: string]: string } = {
    'login': '🔐', 'logout': '🚪',
    'upload': '📤', 'download': '📥',
    'delete': '🗑️', 'edit': '✏️',
    'create_user': '👤+', 'edit_user': '👤✏️', 'delete_user': '👤🗑️', 'toggle_user_status': '👤⚡', 'reset_user_password': '👤🔑',
    'create_folder': '📁+', 'edit_folder': '📁✏️', 'delete_folder': '📁🗑️'
  };
  return iconMap[action] || '📋';
}

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.loadLogs();
    }
  }

  async prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadLogs();
    }
  }

  async clearAuditLogTrail() {
    if (confirm('Are you completely certain you want to purge all security traces from this view?')) {
      alert('This feature requires a backend endpoint for bulk log deletion. Please implement DELETE /api/logs/all');
    }
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
}