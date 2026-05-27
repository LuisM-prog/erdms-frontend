// Matches your exact database schema
export interface Role {
  role_id: 1 | 2;  
  role_name: 'admin' | 'employees';
}

export interface User {
  user_id: number;
  name: string;
  email: string;
  password?: string;  // Only used during login/creation
  role_id: 1 | 2;
  role_name?: 'admin' | 'employees';
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Folder {
  folder_id: number;
  folder_name: string;
  created_by: number | null;
  created_by_name?: string;
  permissions: 'public' | 'private' | 'restricted';
  created_at: string;
}

export interface Document {
  document_id: number;
  title: string;
  description: string | null;
  category: string | null;
  file_path: string;
  accessibility: 'public' | 'private' | 'restricted';
  folder_id: number;
  folder_name?: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  created_at: string;
  file_size?: number;
  file_type?: string;
}

export interface Log {
  log_id: number;
  user_id: number;
  user_name?: string;
  action: 'login' | 'logout' | 'upload' | 'download' | 'delete' | 'edit';
  document_id: number | null;
  document_title?: string;
  timestamp: string;
}

export interface DocumentPermission {
  permission_id: number;
  document_id: number;
  user_id: number;
  permission_type: 'view' | 'download';
  user_name?: string;
  user_email?: string;
}

// API Response wrappers
export interface LoginResponse {
  message: string;
  token: string;
  user: {
    user_id: number;
    name: string;
    email: string;
    role: 'admin' | 'employees';
    status: 'active' | 'inactive';
  };
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    active_percentage: number;
  };
  documents: {
    total: number;
    total_downloads: number;
    total_uploads: number;
  };
  folders: {
    total: number;
  };
  activity: {
    total_logins: number;
  };
  storage: {
    total_bytes: number;
    formatted: string;
  };
}