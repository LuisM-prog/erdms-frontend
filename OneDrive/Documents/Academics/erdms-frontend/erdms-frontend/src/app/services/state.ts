import { Injectable } from '@angular/core';

export interface User {
  UID: number;
  name: string;
  email: string;
  password?: string;
  role_id: number;
  status: string;
  created_at: string;
}

// 📂 Explicit structural interface for shared files/folders
export interface FolderItem {
  id: number;
  name: string;
  title: string;      // Fallback binding mapping reference
  status: string;    // e.g., 'Permitted' or 'Restricted'
  type: string;      // e.g., 'Folder', 'PDF', 'XLSX'
  category: string;  // For your user-side filtering ('Specifications', 'Finance', 'Legal', etc.)
  size: string;
  created_at: string;
  parentId?: number | null;  // Parent folder ID for hierarchy tracking (null = root)
  folderId?: number;  // Folder ID for documents (same as parentId semantically)
  created_by?: number; // User ID who created/uploaded this item
}

// 📋 Explicit structure for keeping track of your system logs
export interface SystemLog {
  id: number;
  userUid: number;
  userName: string;
  action: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class StateService {
  // Global arrays initialized directly to prevent empty state check issues on load
  public usersTable: User[] = [
    {
      UID: 1,
      name: 'Lorenz Gallardo',
      email: 'renzpogl1@gmail.com',
      password: 'password123',
      role_id: 1, // Administrator
      status: 'Active',
      created_at: 'May 20, 2026'
    },
    {
      UID: 2,
      name: 'Andrei Luis M. Monfero',
      email: 'luismonfero@gmail.com',
      password: 'password123',
      role_id: 2, // Manager
      status: 'Active',
      created_at: 'May 22, 2026'
    },
    {
      UID: 3,
      name: 'Jane Doe',
      email: 'janedoe@example.com',
      password: 'password123',
      role_id: 3, // Standard User
      status: 'Active',
      created_at: 'May 24, 2026'
    },
    {
      UID: 4,
      name: 'System Audit Node',
      email: 'auditor.hub@erdms.internal',
      password: 'password123',
      role_id: 4, // Auditor
      status: 'Active',
      created_at: 'May 24, 2026'
    }
  ];

  // 📂 SHARED FOLDER/DOCUMENT SYSTEM REGISTER
  // Both Folder Management (Admin) and Document Explorer (User) point to this reactive array!
  public foldersTable: FolderItem[] = [
    {
      id: 1,
      name: 'Project Alpha Reports - Permitted',
      title: 'Project Alpha Reports - Permitted',
      status: 'Permitted',
      type: 'Folder',
      category: 'Specifications',
      size: 'Shared Portfolio Directory',
      created_at: 'May 24, 2026',
      parentId: null,
      created_by: 1
    },
    {
      id: 2,
      name: 'Q2 Financial Audit Framework.pdf',
      title: 'Q2 Financial Audit Framework.pdf',
      status: 'Permitted',
      type: 'PDF',
      category: 'Finance',
      size: '1.8 MB',
      created_at: 'May 24, 2026',
      folderId: 1,
      created_by: 1
    },
    {
      id: 3,
      name: 'Corporate Compliance Review.xlsx',
      title: 'Corporate Compliance Review.xlsx',
      status: 'Permitted',
      type: 'XLSX',
      category: 'Legal',
      size: '4.2 MB',
      created_at: 'May 24, 2026',
      folderId: 1,
      created_by: 1
    }
  ];

  // 📝 SYSTEM LIVE AUDIT TRAILS ARRAY
  public logsTable: SystemLog[] = [];

  // Tracks the active identity matrix record across route updates (Defaults to Admin for safety)
  public currentUserUID: number = 1;

  constructor() {}

  // System role descriptive utility
  getRoleName(roleId: number): string {
    const roles: { [key: number]: string } = {
      1: 'Administrator',
      2: 'Manager',
      3: 'Standard User',
      4: 'Auditor'
    };
    return roles[roleId] || 'Guest';
  }

  // Active logging engine that appends rows seamlessly to database queries
  writeLogEntry(userUid: number, actionDescription: string): void {
    const actingUser = this.usersTable.find(u => u.UID === userUid);
    const userNameStr = actingUser ? actingUser.name : 'Unknown Operator';
    
    const newLog: SystemLog = {
      id: this.logsTable.length + 1,
      userUid: userUid,
      userName: userNameStr,
      action: actionDescription,
      timestamp: new Date().toLocaleString()
    };

    this.logsTable.unshift(newLog); // Pushes newest logs to the top
    console.log(`[LOG REGISTERED] User #${userUid} (${userNameStr}): ${actionDescription}`);
  }

  // Persist alterations tracking stub
  persistDataChanges(): void {
    console.log('[STATE STUB] Changes written to client-side simulated state.');
  }
}