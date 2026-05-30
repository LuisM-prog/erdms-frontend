import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="user-sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo"></div>
        <div class="brand-text">
          <h3>ERDMS</h3>
          <small>Document Portal</small>
        </div>
      </div>
      
        <nav class="sidebar-menu">
        <a routerLink="/user/dashboard" routerLinkActive="active" class="menu-item">
          <span class="icon">📊</span> Dashboard
        </a>
        <a routerLink="/user/document-management" routerLinkActive="active" class="menu-item">
          <span class="icon">📁</span> Documents
        </a>
        <a routerLink="/user/user-profile" routerLinkActive="active" class="menu-item">
          <span class="icon">👤</span> Profile
        </a>
        </nav>

      <div class="sidebar-footer">
        <button class="signout-btn" (click)="logout()">
          <span class="icon">🚪</span> Sign Out
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .user-sidebar {
      width: 260px;
      min-width: 260px;
      background-color: #0b1329;
      display: flex;
      flex-direction: column;
      height: 100vh;
      border-right: 1px solid #1e293b;
    }

    .sidebar-brand {
      padding: 24px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #1e293b;
    }

    .brand-logo {
      font-size: 20px;
      font-weight: 700;
      color: white;
    }

    .brand-text h3 {
      color: #ffffff;
      margin: 0;
      font-size: 18px;
      font-weight: 700;
    }

    .brand-text small {
      color: #38bdf8;
      font-size: 11px;
      display: block;
      margin-top: 2px;
    }

    .sidebar-menu {
      flex: 1;
      padding: 20px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.2s;
      cursor: pointer;
    }

    .menu-item:hover {
      background-color: #1e293b;
      color: #f8fafc;
    }

    .menu-item.active {
      background-color: #2563eb;
      color: #ffffff;
      font-weight: 600;
    }

    .icon {
      font-size: 16px;
      width: 20px;
    }

    .sidebar-footer {
      padding: 20px 16px;
      border-top: 1px solid #1e293b;
    }

    .signout-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 10px 16px;
      background: none;
      border: none;
      border-radius: 8px;
      color: #94a3b8;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }

    .signout-btn:hover {
      background-color: #7f1d1d;
      color: #fca5a5;
    }

    .signout-btn .icon {
      font-size: 16px;
    }
  `]
})
export class UserSidebarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    if (confirm('Are you sure you want to sign out?')) {
      this.auth.logout();
    }
  }
}