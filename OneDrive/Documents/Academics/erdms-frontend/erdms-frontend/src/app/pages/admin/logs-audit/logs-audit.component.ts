import { Component, OnInit } from '@angular/core';
import { CommonModule, NgSwitch, NgSwitchCase } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';

export interface SystemAuditLog {
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
  imports: [CommonModule, FormsModule, NgSwitch, NgSwitchCase], 
  templateUrl: './logs-audit.component.html',
  styleUrl: './logs-audit.component.css'
})
export class LogsAuditComponent implements OnInit {
  // LIVE AUDIT MATRIX INTERACTIVE FILTER MODEL FIELDS
  searchQuery = '';
  selectedCategory = 'ALL';

  // COMPLETE TRACE DATA STORAGE MAPPED TO SPECIFIED USE CASES
  auditLogsList: SystemAuditLog[] = [];

  constructor(private router: Router, public state: StateService) {}

  ngOnInit(): void {
    this.loadMockSystemAuditTrail();
  }

  // CORE USE CASE: FILTERS LOG ENTRIES BY SEARCH QUERIES AND SPECIFIC CATEGORIES
  get filteredAuditTrail(): SystemAuditLog[] {
    return this.auditLogsList.filter(log => {
      const matchesSearch = 
        log.details.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        log.UID.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesCategory = 
        this.selectedCategory === 'ALL' || log.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  // HANDLES ROUTER SIDEBAR DELEGATES
  navToDashboard() { this.router.navigate(['/admin/dashboard']); }
  navToDocManagement() { this.router.navigate(['/admin/folder-management']); }
  navToUserManagement() { this.router.navigate(['/admin/user-management']); }
  navToAuditLogs() { this.router.navigate(['/admin/audit-logs']); }

  executeSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      this.router.navigate(['/login']);
    }
  }

  // COMPONENT ACTION HANDLER: CLEARS CURRENT TRACE EVENT LIST VIEW
  clearAuditLogTrail() {
    if (confirm('Are you completely certain you want to purge all security traces from this view?')) {
      this.auditLogsList = [];
    }
  }

  // 📝 REMOVED GLOBAL SYSTEM ACTIVITY TRACE MOCKS:
  // Starts with a clean array state layout framework so that only actual runtime events display.
  private loadMockSystemAuditTrail() {
    this.auditLogsList = [];
  }
}