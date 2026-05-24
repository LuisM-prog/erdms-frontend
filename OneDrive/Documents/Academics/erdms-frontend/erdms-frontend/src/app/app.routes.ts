import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { UserManagementComponent } from './pages/admin/user-management/user-management';
import { FolderManagementComponent } from './pages/admin/folder-management/folder-management';
import { LogsAuditComponent } from './pages/admin/logs-audit/logs-audit.component';

// Admin Dash Component Import
import { DashboardComponent as AdminDashboard } from './pages/admin/dashboard/dashboard'; 

// User Workspace Component Map Imports
import { DashboardComponent as UserDashboard } from './pages/user/dashboard/dashboard.component';
import { DocumentExplorerComponent } from './pages/user/document-explorer/document-explorer';
import { UserProfileComponent } from './pages/user/user-profile/user-profile';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // ==========================================================================
  // 🛡️ ADMIN PORTAL ACCESS CHANNELS
  // ==========================================================================
  { path: 'admin/dashboard', component: AdminDashboard },
  { path: 'admin/user-management', component: UserManagementComponent },
  { path: 'admin/folder-management', component: FolderManagementComponent },
  { path: 'admin/audit-logs', component: LogsAuditComponent },
  { path: 'admin/logs-audit', redirectTo: 'admin/audit-logs' },
  
  // ==========================================================================
  // 👥 REGISTERED USER SPACE ROUTING CONSOLE
  // ==========================================================================
  { path: 'user/dashboard', component: UserDashboard },
  
  // Synced precisely to capture workspace sidebar triggers cleanly
  { path: 'user/document-management', component: DocumentExplorerComponent },
  
  { path: 'user/user-profile', component: UserProfileComponent },
  
  // ==========================================================================
  // 🪓 FALLBACK ROUTE CATCH-ALL RECOVERY
  // ==========================================================================
  { path: '**', redirectTo: 'login' }
];