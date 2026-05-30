export interface PendingAction {
  pending_id: number;
  requested_by: number;
  requested_by_name?: string;
  target_user_id: number;
  target_user_name?: string;
  target_user_email?: string;
  action_type: 'activate' | 'deactivate';
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  rejection_reason?: string;
}