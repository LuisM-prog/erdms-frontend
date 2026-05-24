import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';

interface SystemLogEntity {
  timestamp: string;
  user_uid: number;
  action_executed_description?: string;
  action_description?: string;
  description?: string;
  message?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  logSearchQuery: string = '';
  selectedLogTypeFilter: string = 'All Logs';

  constructor(public router: Router, public state: StateService) {}

  ngOnInit(): void {
    if (!(this.state as any).usersTable) {
      (this.state as any).usersTable = [
        { uid: '#', name: 'Lorenz Gallardo', email: 'renzpogl1@gmail.com', role: 'Admin', status: 'Active' },
        { uid: '#', name: 'andrei luis m monfero', email: 'luismonfeo@gmail.com', role: 'User', status: 'Active' }
      ];
    }
    if (!(this.state as any).documentsTable) {
      (this.state as any).documentsTable = [];
    }
  }

  get totalRegisteredUsers(): number {
    return Array.isArray(this.state.usersTable) ? this.state.usersTable.length : 2;
  }

  get activeUsersCount(): number {
    if (!Array.isArray(this.state.usersTable)) return 2;
    return this.state.usersTable.filter((u: any) => u.status === 'Active').length;
  }

  get totalUploadedDocuments(): number {
    let count = 0;
    if (Array.isArray((this.state as any).documentsTable)) {
      count += (this.state as any).documentsTable.length;
    }
    const countDocsInNode = (node: any) => {
      if (!node) return;
      if (Array.isArray(node.documents)) count += node.documents.length;
      if (Array.isArray(node.subfolders)) node.subfolders.forEach(countDocsInNode);
    };
    if (Array.isArray((this.state as any).foldersStructure)) {
      (this.state as any).foldersStructure.forEach(countDocsInNode);
    }
    return count === 0 ? 2 : count;
  }

  get activeEngagementRatio(): number {
    return 100;
  }

  get averageAssetsPerDirectory(): number {
    return 2;
  }

  get systemActionVelocity(): string {
    const logs = this.allGlobalLogs;
    if (logs.length > 15) return 'High Stress';
    if (logs.length > 5) return 'Medium Intensity';
    return 'Low Intensity';
  }

  get allGlobalLogs(): SystemLogEntity[] {
    const stateObj = this.state as any;
    let combined: SystemLogEntity[] = [];
    if (Array.isArray(stateObj.logsTable)) combined = combined.concat(stateObj.logsTable);
    if (Array.isArray(stateObj.auditTable)) combined = combined.concat(stateObj.auditTable);
    if (Array.isArray(stateObj.auditLogs)) combined = combined.concat(stateObj.auditLogs);

    const stringify = (l: any) => JSON.stringify(l);
    const seen = new Set<string>();
    return combined.filter(item => {
      const hash = `${item.timestamp}_${item.user_uid}_${this.extractLogText(item)}`;
      if (seen.has(hash)) return false;
      seen.add(hash);
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  get filteredGlobalLogs(): SystemLogEntity[] {
    return this.allGlobalLogs.filter(log => {
      const text = this.extractLogText(log);
      const query = this.logSearchQuery.toLowerCase().trim();
      const matchesText = !query || text.toLowerCase().includes(query) || String(log.user_uid).includes(query);

      let matchesType = true;
      if (this.selectedLogTypeFilter === 'Modifications') {
        matchesType = text.toLowerCase().includes('alter') || text.toLowerCase().includes('update') || text.toLowerCase().includes('rename') || text.toLowerCase().includes('change');
      } else if (this.selectedLogTypeFilter === 'Uploads') {
        matchesType = text.toLowerCase().includes('upload') || text.toLowerCase().includes('bind') || text.toLowerCase().includes('asset');
      } else if (this.selectedLogTypeFilter === 'Deletions') {
        matchesType = text.toLowerCase().includes('purge') || text.toLowerCase().includes('delete') || text.toLowerCase().includes('remove');
      }

      return matchesText && matchesType;
    });
  }

  extractLogText(log: SystemLogEntity): string {
    if (!log) return '';
    return log.action_description || log.action_executed_description || log.description || log.message || 'System baseline event triggered';
  }

  purgeEntireGlobalAuditHistory() {
    if (confirm('CRITICAL ACTION: Are you sure you want to permanently clear the global system audit log history? This cannot be undone.')) {
      (this.state as any).logsTable = [];
      if ((this.state as any).auditTable) (this.state as any).auditTable = [];
      if ((this.state as any).auditLogs) (this.state as any).auditLogs = [];
      this.state.persistDataChanges();
    }
  }

  navToDashboard() { 
    this.router.navigate(['/admin/dashboard']); 
  }
  
  navToDocManagement() { 
    this.router.navigate(['/admin/folder-management']); 
  }
  
  navToUserManagement() { 
    this.router.navigate(['/admin/user-management']); 
  }
  
  navToAuditLogs() {
    this.router.navigate(['/admin/audit-logs']);
  }

  executeSignOut() {
    if (confirm('Security Session Termination: Are you sure you want to exit the ERDMS administrative desk?')) {
      this.router.navigate(['/login']);
    }
  }
}