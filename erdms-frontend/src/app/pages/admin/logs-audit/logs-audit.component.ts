import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { AdminHeaderComponent } from '../../../components/admin-header/admin-header.component';

@Component({
  selector: 'app-logs-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, AdminHeaderComponent], 
  templateUrl: './logs-audit.component.html',
  styleUrl: './logs-audit.component.css'
})
export class LogsAuditComponent implements OnInit {
  // Filter properties
  searchQuery = '';
  selectedAction = 'ALL';
  startDate = '';
  endDate = '';
  
  // Pagination
  allLogs: any[] = [];
  filteredLogs: any[] = [];
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;
  totalItems = 0;
  
  isLoading = true;
  errorMessage = '';

  // Available actions for filter dropdown
  availableActions = [
    { value: 'ALL', label: 'All Actions' },
    { value: 'login', label: '🔐 Login', icon: '🔐' },
    { value: 'logout', label: '🚪 Logout', icon: '🚪' },
    { value: 'upload', label: '📤 Upload', icon: '📤' },
    { value: 'download', label: '📥 Download', icon: '📥' },
    { value: 'delete', label: '🗑️ Delete', icon: '🗑️' },
    { value: 'edit', label: '✏️ Edit', icon: '✏️' },
    { value: 'create_user', label: '👤+ Create User', icon: '👤+' },
    { value: 'edit_user', label: '👤✏️ Edit User', icon: '👤✏️' },
    { value: 'delete_user', label: '👤🗑️ Delete User', icon: '👤🗑️' },
    { value: 'toggle_user_status', label: '👤⚡ Toggle Status', icon: '👤⚡' },
    { value: 'create_folder', label: '📁+ Create Folder', icon: '📁+' },
    { value: 'edit_folder', label: '📁✏️ Edit Folder', icon: '📁✏️' },
    { value: 'delete_folder', label: '📁🗑️ Delete Folder', icon: '📁🗑️' }
  ];

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
    this.errorMessage = '';
    try {
      const result = await this.state.getAllLogs({ limit: 500 });
      this.allLogs = result.logs || [];
      this.applyFilters();
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load logs';
      console.error('Error loading logs:', error);
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters() {
    let filtered = [...this.allLogs];
    
    // Filter by action type
    if (this.selectedAction !== 'ALL') {
      filtered = filtered.filter(log => log.action === this.selectedAction);
    }
    
    // Filter by search query (searches in details, user name, document title)
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(log => {
        const details = (log.details || '').toLowerCase();
        const userName = (log.user_name || '').toLowerCase();
        const docTitle = (log.document_title || '').toLowerCase();
        return details.includes(query) || userName.includes(query) || docTitle.includes(query);
      });
    }
    
    // Filter by date range
    if (this.startDate) {
      const start = new Date(this.startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(log => new Date(log.timestamp) >= start);
    }
    
    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.timestamp) <= end);
    }
    
    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    this.filteredLogs = filtered;
    this.totalItems = filtered.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1; // Reset to first page when filters change
  }

  get paginatedLogs(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredLogs.slice(start, end);
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.totalItems ? this.totalItems : end;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      // Scroll to top of table
      document.querySelector('.logs-table-container')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      document.querySelector('.logs-table-container')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedAction = 'ALL';
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }

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
      'super_admin_status_change': 'SUPER ADMIN ACTION',
      'request_status_change': 'REQUEST STATUS CHANGE',
      'approve_status_change': 'APPROVE REQUEST',
      'reject_status_change': 'REJECT REQUEST',
      'create_folder': 'CREATE FOLDER',
      'edit_folder': 'EDIT FOLDER',
      'delete_folder': 'DELETE FOLDER',
      'edit_profile': 'EDIT PROFILE',
      'change_password': 'CHANGE PASSWORD'
    };
    return actionMap[action] || action.toUpperCase().replace(/_/g, ' ');
  }

  getActionIcon(action: string): string {
    if (!action) return '📋';
    
    const iconMap: Record<string, string> = {
      'login': '🔐', 'logout': '🚪',
      'upload': '📤', 'download': '📥',
      'delete': '🗑️', 'edit': '✏️',
      'create_user': '👤+', 'edit_user': '👤✏️', 'delete_user': '👤🗑️',
      'toggle_user_status': '👤⚡',
      'super_admin_status_change': '👑⚡',
      'request_status_change': '📨⏳',
      'approve_status_change': '✅📋',
      'reject_status_change': '❌📋',
      'create_folder': '📁+', 'edit_folder': '📁✏️', 'delete_folder': '📁🗑️',
      'edit_profile': '👤📝', 'change_password': '🔑'
    };
    return iconMap[action] || '📋';
  }

  getActionBadgeClass(action: string): string {
    const loginActions = ['login', 'logout'];
    const transferActions = ['upload', 'download'];
    const userActions = ['create_user', 'edit_user', 'delete_user', 'toggle_user_status'];
    const folderActions = ['create_folder', 'edit_folder', 'delete_folder'];
    const requestActions = ['request_status_change', 'approve_status_change', 'reject_status_change', 'super_admin_status_change'];
    
    if (loginActions.includes(action)) return 'badge-login';
    if (transferActions.includes(action)) return 'badge-transfer';
    if (userActions.includes(action)) return 'badge-user';
    if (folderActions.includes(action)) return 'badge-folder';
    if (requestActions.includes(action)) return 'badge-request';
    return 'badge-access';
  }

  getActionDescription(log: any): string {
    const userName = log.user_name || 'Unknown User';
    
    if (log.details) {
      return `${userName} ${log.details}`;
    }
    
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
      case 'edit_user': return `${userName} edited a user account`;
      case 'delete_user': return `${userName} deleted a user account`;
      case 'toggle_user_status': return `${userName} toggled a user's account status`;
      case 'create_folder': return `${userName} created a new folder`;
      case 'edit_folder': return `${userName} edited a folder`;
      case 'delete_folder': return `${userName} deleted a folder`;
      default: return `${userName} performed ${action.replace(/_/g, ' ')}`;
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // Navigation
  navToDashboard() { this.router.navigate(['/admin/dashboard']); }
  navToDocManagement() { this.router.navigate(['/admin/folder-management']); }
  navToUserManagement() { this.router.navigate(['/admin/user-management']); }
  navToAuditLogs() { this.router.navigate(['/admin/audit-logs']); }
}