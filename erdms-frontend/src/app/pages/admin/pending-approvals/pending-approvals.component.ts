import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PendingActionsService } from '../../../services/pending-actions.service';
import { AuthService } from '../../../services/auth.service';
import { StateService } from '../../../services/state';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { AdminHeaderComponent } from '../../../components/admin-header/admin-header.component';
import { PendingAction } from '../../../models/pending-action.model';

@Component({
  selector: 'app-pending-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, AdminHeaderComponent],
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.css']
})
export class PendingApprovalsComponent implements OnInit {
  pendingActions: PendingAction[] = [];
  isLoading = true;
  errorMessage = '';
  rejectionReason = '';
  showRejectModal = false;
  selectedActionId: number | null = null;

  constructor(
    private router: Router,
    private pendingActionsService: PendingActionsService,
    public auth: AuthService,
    private state: StateService
  ) {}

  ngOnInit(): void {
    this.loadPendingActions();
  }

  async loadPendingActions() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.pendingActions = await this.pendingActionsService.getPendingActions();
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load pending approvals';
    } finally {
      this.isLoading = false;
    }
  }

  async approveAction(pendingId: number) {
    if (confirm('Are you sure you want to approve this request?')) {
      const success = await this.pendingActionsService.approveAction(pendingId);
      if (success) {
        alert('Request approved successfully!');
        await this.loadPendingActions();
      } else {
        alert('Failed to approve request.');
      }
    }
  }

  openRejectModal(pendingId: number) {
    this.selectedActionId = pendingId;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  async rejectAction() {
    if (!this.selectedActionId) return;
    
    const success = await this.pendingActionsService.rejectAction(this.selectedActionId, this.rejectionReason);
    if (success) {
      alert('Request rejected successfully!');
      this.showRejectModal = false;
      await this.loadPendingActions();
    } else {
      alert('Failed to reject request.');
    }
  }

  closeRejectModal() {
    this.showRejectModal = false;
    this.selectedActionId = null;
    this.rejectionReason = '';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  navigateToDashboard() {
    this.router.navigate(['/admin/dashboard']);
  }

  navigateToUserManagement() {
    this.router.navigate(['/admin/user-management']);
  }

  executeSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      this.auth.logout();
    }
  }
}