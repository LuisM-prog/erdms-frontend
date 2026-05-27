import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard, EmployeeGuard } from './guards/role.guard';
import { LoginComponent } from './pages/login/login';

// Admin Components
import { DashboardComponent as AdminDashboard } from './pages/admin/dashboard/dashboard';
import { UserManagementComponent } from './pages/admin/user-management/user-management';
import { FolderManagementComponent } from './pages/admin/folder-management/folder-management';
import { LogsAuditComponent } from './pages/admin/logs-audit/logs-audit.component';

// User Components
import { DashboardComponent as UserDashboard } from './pages/user/dashboard/dashboard.component';
import { DocumentExplorerComponent } from './pages/user/document-explorer/document-explorer';
import { UserProfileComponent } from './pages/user/user-profile/user-profile';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // ==========================================================================
  // 🛡️ ADMIN PORTAL (role_name = 'admin' only)
  // ==========================================================================
  { 
    path: 'admin', 
    canActivate: [AuthGuard, AdminGuard],
    children: [
      { path: 'dashboard', component: AdminDashboard },
      { path: 'user-management', component: UserManagementComponent },
      { path: 'folder-management', component: FolderManagementComponent },
      { path: 'audit-logs', component: LogsAuditComponent },
      { path: 'logs-audit', redirectTo: 'audit-logs' },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // ==========================================================================
  // 👥 EMPLOYEE PORTAL (role_name = 'employees' only)
  // ==========================================================================
  { 
    path: 'user', 
    canActivate: [AuthGuard, EmployeeGuard],
    children: [
      { path: 'dashboard', component: UserDashboard },
      { path: 'document-management', component: DocumentExplorerComponent },
      { path: 'user-profile', component: UserProfileComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // ==========================================================================
  // 🪓 FALLBACK ROUTE
  // ==========================================================================
  { path: '**', redirectTo: 'login' }
];