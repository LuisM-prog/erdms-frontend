import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state';

interface SelectableUser {
  user_id: number;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  selected: boolean;
}

@Component({
  selector: 'app-user-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-selector-container" *ngIf="isOpen">
      <div class="user-selector-overlay" (click)="close()"></div>
      <div class="user-selector-modal">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" (click)="close()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="info-note" *ngIf="infoMessage">
            <span>ℹ️</span> {{ infoMessage }}
          </div>
          
          <div class="search-section">
            <input 
              type="text" 
              [(ngModel)]="searchTerm" 
              (input)="filterUsers()"
              placeholder="Search by name, email, or UID..."
              class="search-input">
          </div>
          
          <div class="user-list">
            <div *ngIf="filteredUsers.length === 0" class="empty-state">
              No users found
            </div>
            <div *ngFor="let user of filteredUsers" class="user-item">
              <label class="user-checkbox">
                <input 
                  type="checkbox" 
                  [(ngModel)]="user.selected" 
                  (change)="onUserSelect(user)">
                <div class="user-info">
                  <span class="user-name">{{ user.name }}</span>
                  <span class="user-details">
                    UID: {{ user.user_id }} | 
                    Role: {{ user.role_name === 'admin' ? 'Admin' : 'Employee' }}
                  </span>
                  <span class="user-email">{{ user.email }}</span>
                </div>
              </label>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="selection-info" *ngIf="selectedCount > 0">
            {{ selectedCount }} user(s) selected
          </div>
          <div class="button-group">
            <button class="btn-cancel" (click)="close()">Cancel</button>
            <button class="btn-confirm" (click)="confirmSelection()" [disabled]="selectedCount === 0">
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-selector-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2000;
    }

    .user-selector-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
    }

    .user-selector-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      max-width: 90%;
      max-height: 80vh;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #94a3b8;
    }

    .close-btn:hover {
      color: #ef4444;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .info-note {
      background: #eff6ff;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12px;
      color: #1e40af;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-section {
      margin-bottom: 16px;
    }

    .search-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }

    .search-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    .user-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .user-item {
      border-bottom: 1px solid #f1f5f9;
    }

    .user-item:last-child {
      border-bottom: none;
    }

    .user-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .user-checkbox:hover {
      background: #f8fafc;
    }

    .user-checkbox input {
      margin-top: 2px;
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      display: block;
      font-weight: 600;
      font-size: 14px;
      color: #1e293b;
    }

    .user-details {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }

    .user-email {
      display: block;
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #94a3b8;
      font-size: 13px;
    }

    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .selection-info {
      font-size: 12px;
      font-weight: 500;
      color: #2563eb;
    }

    .button-group {
      display: flex;
      gap: 10px;
    }

    .btn-cancel {
      padding: 8px 16px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }

    .btn-cancel:hover {
      background: #e2e8f0;
    }

    .btn-confirm {
      padding: 8px 20px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-confirm:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-confirm:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
  `]
})
export class UserSelectorComponent implements OnInit {
  @Input() isOpen = false;
  @Input() title = 'Select Users';
  @Input() mode: 'private' | 'restricted' = 'private';
  @Input() preSelectedUserIds: number[] = [];
  
  @Output() closed = new EventEmitter<void>();
  @Output() usersSelected = new EventEmitter<number[]>();

  allUsers: SelectableUser[] = [];
  filteredUsers: SelectableUser[] = [];
  searchTerm = '';
  selectedCount = 0;
  infoMessage = '';

  constructor(private state: StateService) {}

  async ngOnInit() {
    await this.loadUsers();
  }

    async loadUsers() {
    const users = await this.state.getAllUsersSimple();
    let filteredUsers = users;
    
    if (this.mode === 'restricted') {
        // Restricted mode: Show ONLY employees (role_id = 2)
        // Because admins already have access by default
        filteredUsers = users.filter(user => user.role_id === 2);
        this.infoMessage = 'Restricted access: Admins already have access. Select employees to grant access.';
    } else {
        // Private mode: Show ALL users (both admins and employees)
        // Because everyone needs explicit permission
        this.infoMessage = 'Private access: All users (including admins) need explicit permission to access this item.';
    }
    
    this.allUsers = filteredUsers.map(user => ({
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name,
        selected: this.preSelectedUserIds.includes(user.user_id)
    }));
    
    this.filteredUsers = [...this.allUsers];
    this.updateSelectedCount();
    }

  filterUsers() {
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.allUsers.filter(user => 
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.user_id.toString().includes(term)
    );
  }

  onUserSelect(user: SelectableUser) {
    this.updateSelectedCount();
  }

  updateSelectedCount() {
    this.selectedCount = this.allUsers.filter(u => u.selected).length;
  }

  confirmSelection() {
    const selectedIds = this.allUsers.filter(u => u.selected).map(u => u.user_id);
    this.usersSelected.emit(selectedIds);
    this.close();
  }

  close() {
    this.closed.emit();
  }
}