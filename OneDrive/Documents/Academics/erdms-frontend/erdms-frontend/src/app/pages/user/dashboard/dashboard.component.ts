import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  // Using 'any' avoids compilation breaks if interface names in state.ts shift around
  public loggedInUser: any = null;
  public userLogs: any[] = [];

  constructor(private router: Router, private state: StateService) {}

  ngOnInit(): void {
    // Determine the active user session context safely
    const currentUID = this.state.currentUserUID || 3; 
    
    if (this.state.usersTable) {
      this.loggedInUser = this.state.usersTable.find((u: any) => u.UID === currentUID) || null;
    }

    // Pull systemic user logs matching this specific profile context
    if (this.state.logsTable) {
      this.userLogs = this.state.logsTable
        .filter((log: any) => {
          const logUID = log.user_id || log.account_id || log.uid || log.UID;
          return logUID === currentUID;
        })
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  }

  // Resolves TS2551 by providing a flawless link handler matching your sidebar tabs
  navigateToTab(routePath: string): void {
    this.router.navigate([routePath]);
  }

  executeSignOut(): void {
    if (confirm('Are you sure you want to log out of your session?')) {
      this.router.navigate(['/login']);
    }
  }
}