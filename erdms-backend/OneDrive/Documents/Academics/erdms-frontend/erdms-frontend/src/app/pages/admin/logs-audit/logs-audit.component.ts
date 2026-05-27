import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService, SystemLog } from '../../../services/state';

export interface UIStructuredLog {
  logID: number;
  timestamp: string;
  UID: string;
  category: 'LOGIN' | 'TRANSFER' | 'ACCESS';
  details: string;
  status: 'Success' | 'Failed';
}

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

  constructor(private router: Router, public state: StateService) {}

  ngOnInit(): void {
    // Verifies data layer tables are alive and assigned
    if (!this.state.logsTable) {
      this.state.logsTable = [];
    }
  }

  // Live historical tracking stream accessor mapping directly to your shared State registers
  get auditLogsList(): UIStructuredLog[] {
    const records = this.state.logsTable || [];
    return records.map((log: SystemLog) => {
      // Intelligently parse category type from action text signatures
      let inferredCategory: 'LOGIN' | 'TRANSFER' | 'ACCESS' = 'ACCESS';
      const actionText = (log.action || '').toUpperCase();
      
      if (actionText.includes('LOGIN') || actionText.includes('SIGN OUT')) {
        inferredCategory = 'LOGIN';
      } else if (actionText.includes('UPLOAD') || actionText.includes('FILE') || actionText.includes('ASSET')) {
        inferredCategory = 'TRANSFER';
      }

      return {
        logID: log.id || 100,
        timestamp: log.timestamp || new Date().toLocaleString(),
        UID: `#${log.userUid || 1}`,
        category: inferredCategory,
        details: log.action || 'System action trace recorded.',
        status: 'Success'
      };
    });
  }

  get filteredAuditTrail(): UIStructuredLog[] {
    return this.auditLogsList.filter(log => {
      const matchesSearch = 
        log.details.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        log.UID.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesCategory = 
        this.selectedCategory === 'ALL' || log.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  // Sidebar Layout Navigation Link Handlers
  navToDashboard() { this.router.navigate(['/admin/dashboard']); }
  navToDocManagement() { this.router.navigate(['/admin/folder-management']); }
  navToUserManagement() { this.router.navigate(['/admin/user-management']); }
  navToAuditLogs() { this.router.navigate(['/admin/audit-logs']); }

  executeSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      this.router.navigate(['/login']);
    }
  }

  clearAuditLogTrail() {
    if (confirm('Are you completely certain you want to purge all security traces from this view?')) {
      this.state.logsTable = [];
      if ((this.state as any).auditTable) (this.state as any).auditTable = [];
      this.state.persistDataChanges();
    }
  }
}