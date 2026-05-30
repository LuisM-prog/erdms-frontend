import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpService } from './http.service';
import { AuthService } from './auth.service';

import { User, Folder, Document, Log } from '../models/backend-models';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private http = inject(HttpService);
  private auth = inject(AuthService);

  // ==========================================================================
  // USER API METHODS
  // ==========================================================================

  async getAllUsers(): Promise<User[]> {
    try {
      return await firstValueFrom(this.http.get<User[]>('/users'));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return [];
    }
  }

  async getUserById(userId: number): Promise<User | null> {
    try {
      return await firstValueFrom(this.http.get<User>(`/users/${userId}`));
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
      return null;
    }
  }

  async createUser(user: { name: string; email: string; role_id: 1 | 2 }): Promise<{ user_id: number; temporary_password: string } | null> {
    try {
      const result = await firstValueFrom(this.http.post<{ user_id: number; temporary_password: string }>('/users', user));
      return result;
    } catch (error) {
      console.error('Failed to create user:', error);
      return null;
    }
  }

  async updateUser(userId: number, data: { name?: string; email?: string; role_id?: number; status?: 'active' | 'inactive' }): Promise<boolean> {
    try {
      await firstValueFrom(this.http.put<void>(`/users/${userId}`, data));
      return true;
    } catch (error) {
      console.error(`Failed to update user ${userId}:`, error);
      return false;
    }
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete<void>(`/users/${userId}`));
      return true;
    } catch (error) {
      console.error(`Failed to delete user ${userId}:`, error);
      return false;
    }
  }

  async toggleUserStatus(userId: number, status: 'active' | 'inactive'): Promise<boolean> {
    try {
      await firstValueFrom(this.http.patch<void>(`/users/${userId}/status`, { status }));
      return true;
    } catch (error) {
      console.error(`Failed to toggle status for user ${userId}:`, error);
      return false;
    }
  }

  async resetUserPassword(userId: number): Promise<{ temporary_password: string } | null> {
    try {
      const result = await firstValueFrom(this.http.post<{ temporary_password: string }>(`/users/${userId}/reset-password`, {}));

      return result;
    } catch (error) {
      console.error(`Failed to reset password for user ${userId}:`, error);
      return null;
    }
  }

  async getMyProfile(): Promise<User | null> {
    try {
      return await firstValueFrom(this.http.get<User>('/users/profile/me'));
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  }

  async updateMyProfile(data: { name?: string; email?: string }): Promise<boolean> {
    try {
      await firstValueFrom(this.http.put<void>('/users/profile/me', data));
      return true;
    } catch (error) {
      console.error('Failed to update profile:', error);
      return false;
    }
  }

  async changeMyPassword(current_password: string, new_password: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.put<void>('/users/profile/change-password', { current_password, new_password }));
      return true;
    } catch (error) {
      console.error('Failed to change password:', error);
      return false;
    }
  }

  // ==========================================================================
  // FOLDER API METHODS
  // ==========================================================================

  async getAllFolders(): Promise<Folder[]> {
    try {
      return await firstValueFrom(this.http.get<Folder[]>('/folders'));
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      return [];
    }
  }

  async getFolderById(folderId: number): Promise<Folder | null> {
    try {
      return await firstValueFrom(this.http.get<Folder>(`/folders/${folderId}`));
    } catch (error) {
      console.error(`Failed to fetch folder ${folderId}:`, error);
      return null;
    }
  }

  async createFolder(folder_name: string, permissions: 'public' | 'private' | 'restricted' = 'public'): Promise<{ folder_id: number } | null> {
    try {
      const result = await firstValueFrom(this.http.post<{ folder_id: number }>('/folders', { folder_name, permissions }));

      return result;
    } catch (error) {
      console.error('Failed to create folder:', error);
      return null;
    }
  }

  async updateFolder(folderId: number, data: { folder_name?: string; permissions?: 'public' | 'private' | 'restricted' }): Promise<boolean> {
    try {
      await firstValueFrom(this.http.put<void>(`/folders/${folderId}`, data));
      return true;
    } catch (error) {
      console.error(`Failed to update folder ${folderId}:`, error);
      return false;
    }
  }

  async deleteFolder(folderId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete<void>(`/folders/${folderId}`));
      return true;
    } catch (error) {
      console.error(`Failed to delete folder ${folderId}:`, error);
      return false;
    }
  }

  // ==========================================================================
  // DOCUMENT API METHODS
  // ==========================================================================

  async getAllDocuments(): Promise<Document[]> {
    try {
      return await firstValueFrom(this.http.get<Document[]>('/documents'));
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      return [];
    }
  }

  async getDocumentsByFolder(folderId: number): Promise<Document[]> {
    try {
      return await firstValueFrom(this.http.get<Document[]>(`/documents/folder/${folderId}`));
    } catch (error) {
      console.error(`Failed to fetch documents for folder ${folderId}:`, error);
      return [];
    }
  }

  async getAccessibleDocuments(): Promise<Document[]> {
    try {
      return await firstValueFrom(this.http.get<Document[]>('/documents/accessible'));
    } catch (error) {
      console.error('Failed to fetch accessible documents:', error);
      return [];
    }
  }

  async getDocumentById(documentId: number): Promise<Document | null> {
    try {
      return await firstValueFrom(this.http.get<Document>(`/documents/${documentId}`));
    } catch (error) {
      console.error(`Failed to fetch document ${documentId}:`, error);
      return null;
    }
  }

  async uploadDocument(formData: FormData): Promise<{ document_id: number; message: string } | null> {
    try {
      const result = await firstValueFrom(this.http.upload<{ document_id: number; message: string }>('/documents/upload', formData));

      return result;
    } catch (error) {
      console.error('Failed to upload document:', error);
      return null;
    }
  }

  async updateDocument(documentId: number, data: { title?: string; description?: string; category?: string; accessibility?: 'public' | 'private' | 'restricted' }): Promise<boolean> {
    try {
      await firstValueFrom(this.http.put<void>(`/documents/${documentId}`, data));
      return true;
    } catch (error) {
      console.error(`Failed to update document ${documentId}:`, error);
      return false;
    }
  }

  async deleteDocument(documentId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete<void>(`/documents/${documentId}`));
      return true;
    } catch (error) {
      console.error(`Failed to delete document ${documentId}:`, error);
      return false;
    }
  }

  async searchDocuments(query: string): Promise<Document[]> {
    try {
      const response = await firstValueFrom(this.http.get<{ results: Document[] }>(`/documents/search?q=${encodeURIComponent(query)}`));
      return response?.results || [];
    } catch (error) {
      console.error('Failed to search documents:', error);
      return [];
    }
  }

  async downloadDocument(documentId: number): Promise<Blob | null> {
    try {
      const blob = await firstValueFrom(this.http.download(`/documents/${documentId}/download`));
      if (blob) {
      }
      return blob;
    } catch (error) {
      console.error(`Failed to download document ${documentId}:`, error);
      return null;
    }
  }

  // ==========================================================================
  // LOG API METHODS
  // ==========================================================================

  // // Add this method to StateService class
  // private async recordAction(action: string, documentId?: number): Promise<void> {
  //   const userId = this.getCurrentUserId();
  //   if (!userId) {
  //     console.warn('[LOG] Cannot record action: No user logged in');
  //     return;
  //   }
    
  //   try {
  //     // Call backend to create log entry
  //     const result = await firstValueFrom(
  //       this.http.post('/logs', { 
  //         user_id: userId, 
  //         action: action, 
  //         document_id: documentId || null 
  //       })
  //     );
  //     console.log(`[LOG] ✓ Action recorded: ${action} by user ${userId}`);
  //   } catch (error: any) {
  //     console.error('[LOG] Failed to record action:', error?.message || error);
  //   }
  // }

  async getAllLogs(params?: { page?: number; limit?: number; action?: string; startDate?: string; endDate?: string }): Promise<{ logs: Log[]; total: number; page: number; total_pages: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.action) queryParams.set('action', params.action);
      if (params?.startDate) queryParams.set('startDate', params.startDate);
      if (params?.endDate) queryParams.set('endDate', params.endDate);
      
      const query = queryParams.toString();
      return await firstValueFrom(this.http.get<any>(`/logs${query ? `?${query}` : ''}`));
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      return { logs: [], total: 0, page: 1, total_pages: 0 };
    }
  }

  async getLogsByUser(userId: number, page = 1, limit = 20): Promise<{ logs: Log[]; total: number }> {
    try {
      // Use the new 'my-logs' endpoint which doesn't require admin
      return await firstValueFrom(this.http.get<any>(`/logs/my-logs?page=${page}&limit=${limit}`));
    } catch (error) {
      console.error(`Failed to fetch logs for user ${userId}:`, error);
      return { logs: [], total: 0 };
    }
  }

  async getLogStats(): Promise<any> {
    try {
      return await firstValueFrom(this.http.get('/logs/stats'));
    } catch (error) {
      console.error('Failed to fetch log stats:', error);
      return null;
    }
  }

  // ==========================================================================
  // PERMISSION API METHODS
  // ==========================================================================

  async getAllUsersSimple(): Promise<{ user_id: number; name: string; email: string; role_id: number; status: string }[]> {
    try {
      return await firstValueFrom(this.http.get('/permissions/users'));
    } catch (error) {
      console.error('Failed to fetch users list:', error);
      return [];
    }
  }

  async getDocumentAccessList(documentId: number): Promise<{ document_id: number; users_with_access: any[] } | null> {
    try {
      return await firstValueFrom(this.http.get(`/permissions/document/${documentId}`));
    } catch (error) {
      console.error(`Failed to fetch access list for document ${documentId}:`, error);
      return null;
    }
  }

  async grantDocumentAccess(documentId: number, user_id: number, permission_type: 'view' | 'download' = 'download'): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`/permissions/document/${documentId}`, { user_id, permission_type }));
      return true;
    } catch (error) {
      console.error(`Failed to grant access for document ${documentId}:`, error);
      return false;
    }
  }

  async revokeDocumentAccess(documentId: number, userId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`/permissions/document/${documentId}/user/${userId}`));
      return true;
    } catch (error) {
      console.error(`Failed to revoke access for document ${documentId}:`, error);
      return false;
    }
  }

  async checkDocumentAccess(document_id: number): Promise<{ has_access: boolean; reason: string; permission_type?: string }> {
    try {
      return await firstValueFrom(this.http.post('/permissions/check', { document_id }));
    } catch (error) {
      console.error('Failed to check document access:', error);
      return { has_access: false, reason: 'error' };
    }
  }

  // ==========================================================================
  // DASHBOARD API METHODS
  // ==========================================================================

  async getDashboardStats(): Promise<any> {
    try {
      return await firstValueFrom(this.http.get('/dashboard/stats'));
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      return null;
    }
  }

  async getChartData(days: 7 | 30 = 7): Promise<any> {
    try {
      return await firstValueFrom(this.http.get(`/dashboard/charts?days=${days}`));
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      return null;
    }
  }

  async getRecentActivity(limit = 20): Promise<any> {
    try {
      return await firstValueFrom(this.http.get(`/dashboard/activity?limit=${limit}`));
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      return null;
    }
  }

  async getTopUsers(limit = 5): Promise<any[]> {
    try {
      return await firstValueFrom(this.http.get(`/dashboard/top-users?limit=${limit}`));
    } catch (error) {
      console.error('Failed to fetch top users:', error);
      return [];
    }
  }

  async getTopDocuments(limit = 5): Promise<any[]> {
    try {
      return await firstValueFrom(this.http.get(`/dashboard/top-documents?limit=${limit}`));
    } catch (error) {
      console.error('Failed to fetch top documents:', error);
      return [];
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  getRoleName(role_id: number): string {
    return role_id === 1 ? 'admin' : 'employees';
  }

  getCurrentUserId(): number {
    return this.auth.currentUser()?.user_id || 0;
  }

  isCurrentUserAdmin(): boolean {
    return this.auth.isAdmin();
  }

  async createFolderWithParent(folderData: { folder_name: string; permissions: 'public' | 'private' | 'restricted'; parent_folder_id?: number }): Promise<{ folder_id: number } | null> {
  try {
    return await firstValueFrom(this.http.post<{ folder_id: number }>('/folders', folderData));
  } catch (error) {
    console.error('Failed to create folder:', error);
    return null;
  }
  }
}