import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  loggedInUser: any = null;
  userLogs: any[] = [];
  isLoading = true;

  constructor(
    private router: Router, 
    private state: StateService,
    public auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadUserData();
  }

  async loadUserData() {
    this.isLoading = true;
    try {
      const userId = this.auth.currentUser()?.user_id;
      if (userId) {
        // Get user profile
        this.loggedInUser = await this.state.getMyProfile();
        
        // Get user-specific logs
        const logsResult = await this.state.getLogsByUser(userId, 1, 50);
        this.userLogs = logsResult.logs || [];
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  navigateToTab(routePath: string): void {
    this.router.navigate([routePath]);
  }

  executeSignOut(): void {
    if (confirm('Are you sure you want to log out of your session?')) {
      this.auth.logout();
    }
  }
}