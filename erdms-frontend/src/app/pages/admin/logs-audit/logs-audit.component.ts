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
      console.log('Logs loaded:', this.allLogs);
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
        const actionText = this.getActionDisplayText(log.action).toLowerCase();
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

  // Map backend action to display text
  getActionDisplayText(action: string): string {
    if (!action) return 'SYSTEM ACTION';
    
    const actionMap: Record<string, string> = {
      'login': 'LOGIN',
      'logout': 'LOGOUT',
      'upload': 'UPLOAD',
      'download': 'DOWNLOAD',
      'delete': 'DELETE',
      'edit': 'EDIT',
      'create_user': 'CREATE USER',
      'edit_user': 'EDIT USER',
      'delete_user': 'DELETE USER',
      'toggle_user_status': 'TOGGLE STATUS',
      'create_folder': 'CREATE FOLDER',
      'edit_folder': 'EDIT FOLDER',
      'delete_folder': 'DELETE FOLDER'
    };
    return actionMap[action] || action.toUpperCase();
  }

  // Get icon for action
  getActionIcon(action: string): string {
    if (!action) return '📋';
    
    const iconMap: Record<string, string> = {
      'login': '🔐', 'logout': '🚪',
      'upload': '📤', 'download': '📥',
      'delete': '🗑️', 'edit': '✏️',
      'create_user': '👤+', 'edit_user': '👤✏️', 'delete_user': '👤🗑️',
      'toggle_user_status': '👤⚡',
      'create_folder': '📁+', 'edit_folder': '📁✏️', 'delete_folder': '📁🗑️'
    };
    return iconMap[action] || '📋';
  }

  // Get badge class for action
  getBadgeClass(action: string): string {
    const loginActions = ['login', 'logout'];
    const transferActions = ['upload', 'download'];
    const adminActions = ['create_user', 'edit_user', 'delete_user', 'create_folder', 'edit_folder', 'delete_folder'];
    
    if (loginActions.includes(action)) return 'badge-login';
    if (transferActions.includes(action)) return 'badge-transfer';
    if (adminActions.includes(action)) return 'badge-admin';
    return 'badge-access';
  }

  // Get full action display (icon + text)
  getActionDisplay(action: string): string {
    return `${this.getActionIcon(action)} ${this.getActionDisplayText(action)}`;
  }

  getActionDescription(log: any): string {
    const userName = log.user_name || 'Unknown User';
    
    // If there's a details column, use it
    if (log.details && log.details.trim() !== '') {
      return `${userName} ${log.details}`;
    }
    
    // Fallback for logs without details
    const action = log.action;
    if (!action) return `${userName} performed an action`;
    
    switch (action) {
      case 'login': return `${userName} logged into the system`;
      case 'logout': return `${userName} logged out of the system`;
      case 'upload': return `${userName} uploaded "${log.document_title || 'a document'}"`;
      case 'download': return `${userName} downloaded "${log.document_title || 'a document'}"`;
      case 'delete': return `${userName} deleted "${log.document_title || 'a document'}"`;
      case 'edit': return `${userName} edited "${log.document_title || 'a document'}"`;
      case 'create_user': return `${userName} created a new user account`;
      case 'edit_user': return `${userName} ${log.details || 'edited a user account'}`;
      case 'delete_user': return `${userName} deleted a user account`;
      case 'toggle_user_status': return `${userName} ${log.details || 'toggled user status'}`;
      case 'create_folder': return `${userName} created a new folder`;
      case 'edit_folder': return `${userName} ${log.details || 'edited a folder'}`;
      case 'delete_folder': return `${userName} deleted a folder`;
      default: return `${userName} performed ${action.replace(/_/g, ' ')}`;
    }
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