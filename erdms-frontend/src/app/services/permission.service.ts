import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpService } from './http.service';

export interface FolderPermission {
  permission_id: number;
  folder_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  permission_type: 'view' | 'download' | 'manage';
  granted_by: number;
  granted_by_name: string;
  granted_at: string;
  expires_at: string | null;
}

export interface AccessRequest {
  request_id: number;
  requester_id: number;
  requester_name: string;
  requester_email: string;
  target_type: 'folder' | 'document';
  target_id: number;
  target_name: string;
  requested_permission: 'view' | 'download' | 'both';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  request_message: string;
  requested_at: string;
  expires_at: string;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  granted_permission: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private http = inject(HttpService);

  // ============================================
  // FOLDER PERMISSIONS
  // ============================================

  // Grant folder access to a user (Super Admin only)
  async grantFolderAccess(folderId: number, userId: number, permissionType: 'view' | 'download' | 'manage', expiresAt?: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post('/folder-permissions/grant', {
        folder_id: folderId,
        user_id: userId,
        permission_type: permissionType,
        expires_at: expiresAt || null
      }));
      return true;
    } catch (error) {
      console.error('Failed to grant folder access:', error);
      return false;
    }
  }

  // Revoke folder access (Super Admin only)
  async revokeFolderAccess(folderId: number, userId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`/folder-permissions/revoke/${folderId}/${userId}`));
      return true;
    } catch (error) {
      console.error('Failed to revoke folder access:', error);
      return false;
    }
  }

  // Get all users with access to a folder (Super Admin only)
  async getFolderAccessList(folderId: number): Promise<FolderPermission[]> {
    try {
      return await firstValueFrom(this.http.get(`/folder-permissions/folder/${folderId}`));
    } catch (error) {
      console.error('Failed to get folder access list:', error);
      return [];
    }
  }

  // ============================================
  // ACCESS REQUESTS
  // ============================================

  // Request access to a folder or document
  async requestAccess(targetType: 'folder' | 'document', targetId: number, requestedPermission: 'view' | 'download' | 'both', message?: string): Promise<{ success: boolean; requestId?: number; expiresAt?: string }> {
    try {
      const result = await firstValueFrom(this.http.post('/access-requests/request', {
        target_type: targetType,
        target_id: targetId,
        requested_permission: requestedPermission,
        request_message: message || ''
      }));
      return { success: true, requestId: (result as any).request_id, expiresAt: (result as any).expires_at };
    } catch (error) {
      console.error('Failed to request access:', error);
      return { success: false };
    }
  }

  // Get all pending access requests (Super Admin only)
  async getPendingAccessRequests(): Promise<AccessRequest[]> {
    try {
      return await firstValueFrom(this.http.get('/access-requests/pending'));
    } catch (error) {
      console.error('Failed to get pending access requests:', error);
      return [];
    }
  }

  // Approve access request (Super Admin only)
  async approveAccessRequest(requestId: number, grantedPermission?: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`/access-requests/${requestId}/approve`, { granted_permission: grantedPermission }));
      return true;
    } catch (error) {
      console.error('Failed to approve access request:', error);
      return false;
    }
  }

  // Reject access request (Super Admin only)
  async rejectAccessRequest(requestId: number, reason: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`/access-requests/${requestId}/reject`, { rejection_reason: reason }));
      return true;
    } catch (error) {
      console.error('Failed to reject access request:', error);
      return false;
    }
  }

  // Check if user has access to an item
  async checkItemAccess(targetType: 'folder' | 'document', targetId: number): Promise<boolean> {
    try {
      const result = await firstValueFrom(this.http.post('/access-requests/check', {
        target_type: targetType,
        target_id: targetId
      }));
      return (result as any).has_access;
    } catch (error) {
      console.error('Failed to check access:', error);
      return false;
    }
  }
}