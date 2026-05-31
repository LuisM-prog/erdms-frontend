import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PendingActionsService } from '../../../services/pending-actions.service';
import { PermissionService } from '../../../services/permission.service';
import { AuthService } from '../../../services/auth.service';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { AdminHeaderComponent } from '../../../components/admin-header/admin-header.component';
import { PendingAction } from '../../../models/pending-action.model';

interface AccessRequest {
  request_id: number;
  requester_id: number;
  requester_name: string;
  requester_email: string;
  target_type: 'folder' | 'document';
  target_id: number;
  target_name: string;
  requested_permission: 'view' | 'download' | 'both';
  status: string;
  request_message: string;
  requested_at: string;
  expires_at: string;
}

@Component({
  selector: 'app-pending-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, AdminHeaderComponent],
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.css']
})
export class PendingApprovalsComponent implements OnInit {
  pendingActions: PendingAction[] = [];
  filteredPendingActions: PendingAction[] = [];
  accessRequests: AccessRequest[] = [];
  filteredAccessRequests: AccessRequest[] = [];
  isLoading = true;
  errorMessage = '';
  rejectionReason = '';
  showRejectModal = false;
  selectedActionId: number | null = null;
  
  // Filters
  actionFilter: 'all' | 'activate' | 'deactivate' = 'all';
  accessRequestFilter: 'all' | 'folder' | 'document' = 'all';
  
  // Access request modal properties
  showAccessRequestModal = false;
  selectedAccessRequest: AccessRequest | null = null;
  selectedPermission: string = 'both';

  constructor(
    private router: Router,
    private pendingActionsService: PendingActionsService,
    private permissionService: PermissionService,
    public auth: AuthService
  ) {}

  async ngOnInit() {
    await this.loadPendingActions();
    await this.loadAccessRequests();
    this.isLoading = false;
  }

  async loadPendingActions() {
    try {
      const actions = await this.pendingActionsService.getPendingActions();
      this.pendingActions = actions;
      this.applyActionFilter();
    } catch (error) {
      console.error('Failed to load pending actions:', error);
      this.errorMessage = 'Failed to load pending actions';
    }
  }

  async loadAccessRequests() {
    try {
      this.accessRequests = await this.permissionService.getPendingAccessRequests();
      this.applyAccessRequestFilter();
    } catch (error) {
      console.error('Failed to load access requests:', error);
      this.errorMessage = 'Failed to load access requests';
    }
  }

  // ============================================
  // FILTER METHODS
  // ============================================

  applyActionFilter() {
    if (this.actionFilter === 'all') {
      this.filteredPendingActions = [...this.pendingActions];
    } else {
      this.filteredPendingActions = this.pendingActions.filter(
        action => action.action_type === this.actionFilter
      );
    }
  }

  applyAccessRequestFilter() {
    if (this.accessRequestFilter === 'all') {
      this.filteredAccessRequests = [...this.accessRequests];
    } else {
      this.filteredAccessRequests = this.accessRequests.filter(
        req => req.target_type === this.accessRequestFilter
      );
    }
  }

  onActionFilterChange() {
    this.applyActionFilter();
  }

  onAccessRequestFilterChange() {
    this.applyAccessRequestFilter();
  }

  // ============================================
  // ACCOUNT STATUS METHODS
  // ============================================

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

  // ============================================
  // ACCESS REQUEST METHODS
  // ============================================

  approveAccessRequest(request: AccessRequest) {
    this.selectedAccessRequest = request;
    this.selectedPermission = request.requested_permission === 'both' ? 'both' : 
                              (request.requested_permission === 'download' ? 'download' : 'view');
    this.showAccessRequestModal = true;
  }

  async confirmApproveAccessRequest() {
    if (!this.selectedAccessRequest) return;
    
    const success = await this.permissionService.approveAccessRequest(
      this.selectedAccessRequest.request_id, 
      this.selectedPermission
    );
    
    if (success) {
      alert('Access request approved successfully!');
      this.showAccessRequestModal = false;
      await this.loadAccessRequests();
    } else {
      alert('Failed to approve request.');
    }
  }

  async rejectAccessRequest(request: AccessRequest) {
    const reason = prompt('Enter reason for rejection (optional):');
    const success = await this.permissionService.rejectAccessRequest(request.request_id, reason || '');
    
    if (success) {
      alert('Access request rejected.');
      await this.loadAccessRequests();
    } else {
      alert('Failed to reject request.');
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getActionBadgeClass(actionType: string): string {
    switch (actionType) {
      case 'activate': return 'badge-activate';
      case 'deactivate': return 'badge-deactivate';
      case 'role_change': return 'badge-role-change';
      case 'password_reset': return 'badge-password-reset';
      default: return '';
    }
  }

  getActionLabel(actionType: string): string {
    switch (actionType) {
      case 'activate': return 'Activate Account';
      case 'deactivate': return 'Deactivate Account';
      case 'role_change': return 'Role Change';
      case 'password_reset': return 'Password Reset';
      default: return actionType;
    }
  }

  // ============================================
  // NAVIGATION
  // ============================================

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