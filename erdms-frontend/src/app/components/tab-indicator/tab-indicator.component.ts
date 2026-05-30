import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tab-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tab-indicator" *ngIf="showIndicator">
      <span class="tab-badge">Tab ID: {{ getShortTabId() }}</span>
      <span class="user-badge">Logged in as: {{ getCurrentUserEmail() }}</span>
    </div>
  `,
  styles: [`
    .tab-indicator {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-family: monospace;
      z-index: 9999;
      display: flex;
      gap: 8px;
    }
    .tab-badge, .user-badge {
      background: #2563eb;
      padding: 2px 6px;
      border-radius: 4px;
    }
  `]
})
export class TabIndicatorComponent {
  private session = inject(SessionService);
  private auth = inject(AuthService);
  
  showIndicator = true; // Set to false to hide
  
  getShortTabId(): string {
    return this.session.getTabId().slice(-6);
  }
  
  getCurrentUserEmail(): string {
    return this.auth.currentUser()?.email || 'Not logged in';
  }
}