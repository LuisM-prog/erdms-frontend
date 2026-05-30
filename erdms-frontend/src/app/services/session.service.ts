import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly TAB_ID_KEY = 'tab_id';
  private readonly TOKEN_KEY_PREFIX = 'access_token_';
  private readonly USER_KEY_PREFIX = 'current_user_';
  
  private tabId: string;

  constructor() {
    this.tabId = this.getOrCreateTabId();
  }

  private getOrCreateTabId(): string {
    // Check if this tab already has an ID stored in sessionStorage (tab-specific)
    let tabId = sessionStorage.getItem(this.TAB_ID_KEY);
    if (!tabId) {
      tabId = this.generateTabId();
      sessionStorage.setItem(this.TAB_ID_KEY, tabId);
    }
    return tabId;
  }

  private generateTabId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getTabId(): string {
    return this.tabId;
  }

  // Store token for this specific tab
  setToken(token: string): void {
    localStorage.setItem(`${this.TOKEN_KEY_PREFIX}${this.tabId}`, token);
  }

  getToken(): string | null {
    return localStorage.getItem(`${this.TOKEN_KEY_PREFIX}${this.tabId}`);
  }

  removeToken(): void {
    localStorage.removeItem(`${this.TOKEN_KEY_PREFIX}${this.tabId}`);
  }

  // Store user for this specific tab
  setUser(user: any): void {
    localStorage.setItem(`${this.USER_KEY_PREFIX}${this.tabId}`, JSON.stringify(user));
  }

  getUser(): any | null {
    const userStr = localStorage.getItem(`${this.USER_KEY_PREFIX}${this.tabId}`);
    return userStr ? JSON.parse(userStr) : null;
  }

  removeUser(): void {
    localStorage.removeItem(`${this.USER_KEY_PREFIX}${this.tabId}`);
  }

  // Clear all sessions (for testing/cleanup)
  clearAllSessions(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.TOKEN_KEY_PREFIX) || key.startsWith(this.USER_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}