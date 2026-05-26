import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ◄ Imported to fix the [(ngModel)] compilation errors
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule], // ◄ Added FormsModule here so template can bind inputs
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  // 🔍 Interactive Log Filtering Model Fields expected by your template
  logSearchQuery = '';
  selectedLogTypeFilter = 'ALL';

  constructor(private router: Router, public state: StateService) {}

  ngOnInit(): void {
    // Structural safeguards to make sure state arrays exist upon dashboard loading
    if (!(this.state as any).foldersTree) (this.state as any).foldersTree = [];
    if (!(this.state as any).usersTable) (this.state as any).usersTable = [];
    if (!(this.state as any).auditTable) (this.state as any).auditTable = [];
  }

  // 👥 Maps directly to {{ totalRegisteredUsers }}
  get totalRegisteredUsers(): number {
    return this.state.usersTable ? this.state.usersTable.length : 0;
  }

  // 🟢 Maps directly to {{ activeUsersCount }}
  get activeUsersCount(): number {
    if (!this.state.usersTable) return 0;
    return this.state.usersTable.filter(u => u.status === 'Active').length;
  }

  // 📝 Maps directly to {{ totalUploadedDocuments }}
  get totalUploadedDocuments(): number {
    const tree = (this.state as any).foldersTree || [];
    return this.countDocumentsRecursive(tree);
  }

  private countDocumentsRecursive(nodes: any[]): number {
    let count = 0;
    for (const node of nodes) {
      if (node.documents) {
        count += node.documents.length;
      }
      if (node.subfolders && node.subfolders.length > 0) {
        count += this.countDocumentsRecursive(node.subfolders);
      }
    }
    return count;
  }

  // 📊 Maps directly to {{ activeEngagementRatio }}
  get activeEngagementRatio(): number {
    const total = this.totalRegisteredUsers;
    if (total === 0) return 0;
    const active = this.activeUsersCount;
    return Math.round((active / total) * 100);
  }

  // 📁 Maps directly to {{ averageAssetsPerDirectory }}
  get averageAssetsPerDirectory(): number {
    const totalDocs = this.totalUploadedDocuments;
    
    // Counts folders using recursive scanning
    const tree = (this.state as any).foldersTree || [];
    const totalFolders = this.countFoldersRecursive(tree);
    
    if (totalFolders === 0) return totalDocs;
    return Number((totalDocs / totalFolders).toFixed(1));
  }

  private countFoldersRecursive(nodes: any[]): number {
    let count = 0;
    for (const node of nodes) {
      count++;
      if (node.subfolders && node.subfolders.length > 0) {
        count += this.countFoldersRecursive(node.subfolders);
      }
    }
    return count;
  }

  // ⚡ Maps directly to {{ systemActionVelocity }}
  get systemActionVelocity(): string {
    const counts = this.allGlobalLogs.length;
    if (counts === 0) return 'Stable System State';
    if (counts < 5) return 'Low Traffic Matrix';
    return 'Active Operational Flow';
  }

  // 🛡️ Maps directly to @if (allGlobalLogs.length) and loops
  get allGlobalLogs(): any[] {
    return (this.state as any).auditTable || [];
  }

  // 🔍 Maps directly to @for (log of filteredGlobalLogs)
  get filteredGlobalLogs(): any[] {
    const logs = this.allGlobalLogs;
    return logs.filter(log => {
      if (!log) return false;
      
      const text = this.extractLogText(log).toLowerCase();
      const uid = log.UID ? log.UID.toLowerCase() : '';
      const matchesSearch = text.includes(this.logSearchQuery.toLowerCase()) || uid.includes(this.logSearchQuery.toLowerCase());
      
      const category = log.category || 'ACCESS';
      const matchesFilter = this.selectedLogTypeFilter === 'ALL' || category === this.selectedLogTypeFilter;
      
      return matchesSearch && matchesFilter;
    });
  }

  // 📝 Maps directly to {{ extractLogText(log) }}
  extractLogText(log: any): string {
    if (!log) return '';
    return log.action_executed_description || log.action_description || log.details || log.description || log.message || 'System Operation Trace Recorded';
  }

  // 🗑️ Maps directly to (click)="purgeEntireGlobalAuditHistory()"
  purgeEntireGlobalAuditHistory() {
    if (confirm('Are you completely certain you want to purge the global historical log buffer?')) {
      (this.state as any).auditTable = [];
      (this.state as any).logsTable = [];
      (this.state as any).auditLogs = [];
      this.state.persistDataChanges();
    }
  }

  // 🧭 SIDEBAR LINK ROUTING HANDLERS
  navToDashboard() { this.router.navigate(['/admin/dashboard']); }
  navToDocManagement() { this.router.navigate(['/admin/folder-management']); }
  navToUserManagement() { this.router.navigate(['/admin/user-management']); }
  navToAuditLogs() { this.router.navigate(['/admin/audit-logs']); }

  executeSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      this.router.navigate(['/login']);
    }
  }
}