import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  loggedInUser: any = null;
  userLogs: any[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(
    private router: Router,
    private state: StateService,
    public auth: AuthService
  ) {}

  async ngOnInit() {
    await this.loadUserData();
  }

  async loadUserData() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const userId = this.auth.currentUser()?.user_id;
      if (userId) {
        // Get user profile
        this.loggedInUser = await this.state.getMyProfile();
        
        // Get user-specific logs
        const logsResult = await this.state.getLogsByUser(userId, 1, 100);
        this.userLogs = logsResult.logs || [];
      }
    } catch (error) {
      this.errorMessage = 'Failed to load your activity data';
      console.error('Dashboard error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getActionIcon(action: string): string {
    const iconMap: Record<string, string> = {
      'login': '🔐',
      'logout': '🚪',
      'upload': '📤',
      'download': '📥',
      'delete': '🗑️',
      'edit': '✏️',
      'create_user': '👤+',
      'edit_user': '👤✏️',
      'delete_user': '👤🗑️',
      'toggle_user_status': '👤⚡',
      'create_folder': '📁+',
      'edit_folder': '📁✏️',
      'delete_folder': '📁🗑️'
    };
    return iconMap[action] || '📋';
  }

  getActionDescription(log: any): string {
    if (log.details) {
      return log.details;
    }
    
    const action = log.action;
    switch (action) {
      case 'login': return 'Logged into the system';
      case 'logout': return 'Logged out of the system';
      case 'upload': return `Uploaded "${log.document_title || 'a document'}"`;
      case 'download': return `Downloaded "${log.document_title || 'a document'}"`;
      case 'delete': return `Deleted "${log.document_title || 'a document'}"`;
      case 'edit': return `Edited "${log.document_title || 'a document'}"`;
      case 'create_user': return 'Created a new user account';
      case 'edit_user': return 'Edited a user account';
      case 'delete_user': return 'Deleted a user account';
      case 'toggle_user_status': return 'Toggled a user\'s account status';
      case 'create_folder': return 'Created a new folder';
      case 'edit_folder': return 'Edited a folder';
      case 'delete_folder': return 'Deleted a folder';
      default: return `Performed ${action?.replace(/_/g, ' ') || 'an action'}`;
    }
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  navigateToDocuments() {
    this.router.navigate(['/user/document-management']);
  }

  navigateToProfile() {
    this.router.navigate(['/user/user-profile']);
  }

  executeSignOut() {
    if (confirm('Are you sure you want to log out of your session?')) {
      this.auth.logout();
    }
  }
}