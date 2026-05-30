import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpService } from './http.service';
import { PendingAction } from '../models/pending-action.model';

@Injectable({
  providedIn: 'root'
})
export class PendingActionsService {
  private http = inject(HttpService);

  // Request to deactivate/activate a user (requires 2FA approval)
  async requestUserStatusChange(targetUserId: number, actionType: 'activate' | 'deactivate'): Promise<{ message: string; pending_id: number } | null> {
    try {
      return await firstValueFrom(this.http.post('/pending-actions/request', { target_user_id: targetUserId, action_type: actionType }));
    } catch (error) {
      console.error('Failed to request status change:', error);
      return null;
    }
  }

  // Get all pending actions (Super Admin only)
  async getPendingActions(): Promise<PendingAction[]> {
    try {
      return await firstValueFrom(this.http.get('/pending-actions'));
    } catch (error) {
      console.error('Failed to fetch pending actions:', error);
      return [];
    }
  }

  // Approve a pending action (Super Admin only)
  async approveAction(pendingId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`/pending-actions/${pendingId}/approve`, {}));
      return true;
    } catch (error) {
      console.error('Failed to approve action:', error);
      return false;
    }
  }

  // Reject a pending action (Super Admin only)
  async rejectAction(pendingId: number, reason: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`/pending-actions/${pendingId}/reject`, { reason }));
      return true;
    } catch (error) {
      console.error('Failed to reject action:', error);
      return false;
    }
  }
}