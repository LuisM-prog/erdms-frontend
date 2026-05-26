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
  // 👥 SEEDED DEFAULT ACCOUNTS: Contains 1 Master Admin and 1 Standard User account
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
      name: 'Jane Doe',
      email: 'janedoe@erdms.internal',
      password: 'user123',
      role_id: 3, // Standard User
      status: 'Active',
      created_at: 'May 26, 2026'
    }
  ];

  // 📂 SHARED FOLDER/DOCUMENT SYSTEM REGISTER - Default assets removed cleanly
  public foldersTable: FolderItem[] = [];

  // 📝 SYSTEM LIVE AUDIT TRAILS ARRAY
  public logsTable: SystemLog[] = [];

  // Tracks the active identity matrix record across route updates (Defaults to Admin for safety)
  public currentUserUID: number = 2;

  // Property fallbacks to guarantee that Dashboard/Folder Management don't break on unexpected lookups
  public foldersTree: any[] = [];
  public lastActiveFolderId: number | null = null;
  public auditTable: any[] = [];

  constructor() {
    this.loadStateFromStorage();
  }

  // 💾 SEEDS DATA FROM COMPUTER STORAGE SO ACTIONS NEVER DISAPPEAR ACROSS TABS
  private loadStateFromStorage() {
    const savedTree = localStorage.getItem('erdms_folders_tree');
    const savedTable = localStorage.getItem('erdms_folders_table');
    const savedUsers = localStorage.getItem('erdms_users_table');
    const savedLogs = localStorage.getItem('erdms_audit_table');

    if (savedTree) this.foldersTree = JSON.parse(savedTree);
    if (savedTable) this.foldersTable = JSON.parse(savedTable);
    if (savedUsers) this.usersTable = JSON.parse(savedUsers);
    if (savedLogs) this.logsTable = JSON.parse(savedLogs);

    // Initialize root folder into foldersTree structure if empty
    if (this.foldersTree.length === 0) {
      this.foldersTree = [
        {
          folder_id: 1,
          folder_name: 'Root Archive Matrix',
          created_by: 1,
          created_at: 'May 20, 2026',
          permission: 'Public',
          parent_id: null,
          subfolders: [],
          documents: []
        }
      ];
    }
    
    // Create an alias reference to sync auditTable and logsTable together
    this.auditTable = this.logsTable;
  }

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
    this.persistDataChanges();
  }

  // 🔒 COMMITS SYSTEM ARCHIVE FOOTPRINTS DIRECTLY ONTO LAPTOP HARD DRIVE
  persistDataChanges(): void {
    localStorage.setItem('erdms_folders_tree', JSON.stringify(this.foldersTree));
    localStorage.setItem('erdms_folders_table', JSON.stringify(this.foldersTable));
    localStorage.setItem('erdms_users_table', JSON.stringify(this.usersTable));
    localStorage.setItem('erdms_audit_table', JSON.stringify(this.logsTable));
    console.log('💾 Checkpoint saved: All structural data committed permanently.');
  }
}