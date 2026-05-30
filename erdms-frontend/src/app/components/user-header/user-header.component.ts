import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-header">
      <div class="header-profile" (click)="goToProfile()">
        <div class="profile-avatar" *ngIf="!getProfilePicture()">
          {{ getInitial() }}
        </div>
        <img *ngIf="getProfilePicture()" 
             [src]="getProfilePicture()" 
             class="profile-avatar-img"
             alt="Profile">
        <div class="profile-info">
          <span class="profile-name">{{ getCurrentUserName() }}</span>
          <span class="profile-role">{{ getUserRole() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      height: 100%;
      width: 100%;
    }

    .header-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 30px;
      transition: background 0.2s;
    }

    .header-profile:hover {
      background: #f1f5f9;
    }

    .profile-avatar {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
      color: white;
    }

    .profile-avatar-img {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e2e8f0;
    }

    .profile-info {
      display: flex;
      flex-direction: column;
    }

    .profile-name {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }

    .profile-role {
      font-size: 11px;
      color: #64748b;
    }
  `]
})
export class UserHeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  getCurrentUserName(): string {
    return this.auth.currentUser()?.name || 'User';
  }

  getUserRole(): string {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' ? 'Administrator' : 'Employee';
  }

  getProfilePicture(): string | null {
    const userId = this.auth.currentUser()?.user_id;
    if (userId) {
      const savedPicture = localStorage.getItem(`profile_pic_${userId}`);
      if (savedPicture && savedPicture.startsWith('data:image')) {
        return savedPicture;
      }
    }
    return null;
  }

  getInitial(): string {
    const name = this.getCurrentUserName();
    return name.charAt(0).toUpperCase();
  }

  goToProfile() {
    this.router.navigate(['/user/user-profile']);
  }
}