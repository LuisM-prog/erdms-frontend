import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';
import { UserSidebarComponent } from '../../../components/user-sidebar/user-sidebar.component';
import { UserHeaderComponent } from '../../../components/user-header/user-header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, UserSidebarComponent, UserHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  loggedInUser: any = null;
  userLogs: any[] = [];
  recentDocuments: any[] = [];
  recentFolders: any[] = [];
  isLoading = true;
  errorMessage = '';
  searchQuery = '';

  // Stats
  totalDocumentsAccessed = 0;
  totalDownloads = 0;
  totalFoldersAccessed = 0;
  lastActiveDate = '';
  memberSince = '';

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
        this.loggedInUser = await this.state.getMyProfile();
        
        // Get user-specific logs
        const logsResult = await this.state.getLogsByUser(userId, 1, 100);
        this.userLogs = logsResult.logs || [];
        
        // Sort by timestamp descending (newest first)
        this.userLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Calculate stats
        this.calculateStats();
        
        // Extract recent items
        this.extractRecentDocuments();
        this.extractRecentFolders();
        
        // Get last active date
        if (this.userLogs.length > 0) {
          const lastActive = new Date(this.userLogs[0].timestamp);
          this.lastActiveDate = lastActive.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        } else {
          this.lastActiveDate = 'Never';
        }
        
        // Format member since date
        if (this.loggedInUser?.created_at) {
          this.memberSince = new Date(this.loggedInUser.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }
    } catch (error) {
      this.errorMessage = 'Failed to load your activity data';
      console.error('Dashboard error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  calculateStats() {
    // Documents accessed (download + view)
    this.totalDocumentsAccessed = this.userLogs.filter(log => 
      log.action === 'download' || log.action === 'view'
    ).length;
    
    // Downloads count
    this.totalDownloads = this.userLogs.filter(log => log.action === 'download').length;
    
    // Folders accessed (view_folder actions)
    this.totalFoldersAccessed = this.userLogs.filter(log => log.action === 'view_folder').length;
  }

  extractRecentDocuments() {
    const downloadLogs = this.userLogs.filter(log => 
      (log.action === 'download' || log.action === 'view') && log.document_title
    );
    
    const uniqueDocs = new Map();
    for (const log of downloadLogs) {
      if (!uniqueDocs.has(log.document_title)) {
        uniqueDocs.set(log.document_title, {
          title: log.document_title,
          document_id: log.document_id,
          timestamp: log.timestamp,
          action: log.action
        });
      }
    }
    
    this.recentDocuments = Array.from(uniqueDocs.values()).slice(0, 5);
  }

  extractRecentFolders() {
    const folderLogs = this.userLogs.filter(log => 
      log.action === 'view_folder' && log.details
    );
    
    const uniqueFolders = new Map();
    for (const log of folderLogs) {
      // Extract folder name from details (e.g., "Viewed folder 'Folder Name'")
      const match = log.details?.match(/Viewed folder '([^']+)'/);
      const folderName = match ? match[1] : 'Unknown Folder';
      
      if (!uniqueFolders.has(folderName)) {
        uniqueFolders.set(folderName, {
          name: folderName,
          timestamp: log.timestamp
        });
      }
    }
    
    this.recentFolders = Array.from(uniqueFolders.values()).slice(0, 5);
  }

  getActionText(action: string): string {
    const actionMap: Record<string, string> = {
      'login': 'Logged in',
      'logout': 'Logged out',
      'download': 'Downloaded document',
      'view': 'Viewed document',
      'view_folder': 'Viewed folder',
      'edit_profile': 'Updated profile',
      'change_password': 'Changed password'
    };
    return actionMap[action] || action?.replace(/_/g, ' ') || 'Performed action';
  }

  getActionDetail(log: any): string {
    if (log.details) {
      // Clean up details for display
      let detail = log.details;
      if (detail.startsWith('Viewed document')) {
        detail = detail.replace('Viewed document', '');
      } else if (detail.startsWith('Downloaded document')) {
        detail = detail.replace('Downloaded document', '');
      } else if (detail.startsWith('Viewed folder')) {
        detail = detail.replace('Viewed folder', '');
      }
      return detail;
    }
    if (log.document_title) {
      return `"${log.document_title}"`;
    }
    return '';
  }

  getActivityIcon(action: string): string {
    const iconMap: Record<string, string> = {
      'login': '🔐',
      'logout': '🚪',
      'download': '⬇️',
      'view': '👁️',
      'view_folder': '📁',
      'edit_profile': '✏️',
      'change_password': '🔑'
    };
    return iconMap[action] || '📋';
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

  search() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/user/document-management'], { 
        queryParams: { search: this.searchQuery }
      });
    }
  }

  goToDocuments() {
    this.router.navigate(['/user/document-management']);
  }

  goToProfile() {
    this.router.navigate(['/user/user-profile']);
  }

  openDocument(doc: any) {
    this.router.navigate(['/user/document-management']);
  }

  executeSignOut() {
    if (confirm('Are you sure you want to log out?')) {
      this.auth.logout();
    }
  }
}