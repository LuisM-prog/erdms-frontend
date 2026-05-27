import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  logSearchQuery = '';
  selectedLogTypeFilter = 'All Logs';
  
  dashboardStats: any = null;
  allGlobalLogs: any[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(
    private router: Router, 
    public state: StateService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    this.isLoading = true;
    try {
      // Load all dashboard data in parallel
      const [stats, logs] = await Promise.all([
        this.state.getDashboardStats(),
        this.state.getAllLogs({ limit: 100 })
      ]);
      
      this.dashboardStats = stats;
      this.allGlobalLogs = logs.logs || [];
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load dashboard data';
      console.error('Dashboard error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Dashboard stats computed properties
  get totalRegisteredUsers(): number {
    return this.dashboardStats?.users?.total || 0;
  }

  get activeUsersCount(): number {
    return this.dashboardStats?.users?.active || 0;
  }

  get totalUploadedDocuments(): number {
    return this.dashboardStats?.documents?.total || 0;
  }

  get activeEngagementRatio(): number {
    return this.dashboardStats?.users?.active_percentage || 0;
  }

  get averageAssetsPerDirectory(): number {
    const totalDocs = this.totalUploadedDocuments;
    const totalFolders = this.dashboardStats?.folders?.total || 1;
    return Number((totalDocs / totalFolders).toFixed(1));
  }

  get systemActionVelocity(): string {
    const counts = this.allGlobalLogs.length;
    if (counts === 0) return 'Stable System State';
    if (counts < 5) return 'Low Traffic Matrix';
    return 'Active Operational Flow';
  }

  get filteredGlobalLogs(): any[] {
    let logs = this.allGlobalLogs;
    
    // Filter by search query
    if (this.logSearchQuery) {
      const query = this.logSearchQuery.toLowerCase();
      logs = logs.filter(log => {
        const text = this.extractLogText(log).toLowerCase();
        const userName = (log.user_name || '').toLowerCase();
        return text.includes(query) || userName.includes(query);
      });
    }
    
    // Filter by log type
    if (this.selectedLogTypeFilter !== 'All Logs') {
      logs = logs.filter(log => {
        if (this.selectedLogTypeFilter === 'Modifications') {
          return log.action === 'edit' || log.action === 'delete';
        } else if (this.selectedLogTypeFilter === 'Uploads') {
          return log.action === 'upload';
        } else if (this.selectedLogTypeFilter === 'Deletions') {
          return log.action === 'delete';
        }
        return true;
      });
    }
    
    return logs;
  }

  extractLogText(log: any): string {
    if (!log) return '';
    if (log.message) return log.message;
    
    switch (log.action) {
      case 'login': return `${log.user_name || 'User'} logged in`;
      case 'logout': return `${log.user_name || 'User'} logged out`;
      case 'upload': return `${log.user_name || 'User'} uploaded "${log.document_title || 'document'}"`;
      case 'download': return `${log.user_name || 'User'} downloaded "${log.document_title || 'document'}"`;
      case 'delete': return `${log.user_name || 'User'} deleted "${log.document_title || 'document'}"`;
      case 'edit': return `${log.user_name || 'User'} edited "${log.document_title || 'document'}"`;
      default: return log.action_description || log.details || 'System action performed';
    }
  }

  async purgeEntireGlobalAuditHistory() {
    if (confirm('Are you completely certain you want to purge the global historical log buffer? This action cannot be undone.')) {
      // Note: Backend doesn't have a bulk delete endpoint yet
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