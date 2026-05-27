import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';

interface ActiveUserContext {
  name: string;
  position: string;
  email: string;
}

@Component({
  selector: 'app-document-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-explorer.html',
  styleUrl: './document-explorer.css'
})
export class DocumentExplorerComponent implements OnInit {
  userInfo: ActiveUserContext = { name: 'Loading...', position: 'Employee', email: '' };
  isDropdownOpen: boolean = false;
  
  searchQuery: string = '';
  selectedCategory: string = 'All';
  
  allDocuments: any[] = [];
  isLoading = true;
  errorMessage = '';

  // For folder hierarchy (simplified - no nested navigation for now)
  currentFolderId: number | null = null;
  navigationPath: any[] = [];

  constructor(
    public router: Router, 
    public state: StateService,
    public auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadDocuments();
    this.loadUserInfo();
  }

  async loadDocuments() {
    this.isLoading = true;
    try {
      this.allDocuments = await this.state.getAccessibleDocuments();
      console.log('Documents loaded:', this.allDocuments);
    } catch (error) {
      this.errorMessage = 'Failed to load documents';
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  loadUserInfo() {
    const currentUser = this.auth.currentUser();
    if (currentUser) {
      this.userInfo = {
        name: currentUser.name,
        position: currentUser.role === 'admin' ? 'Administrator' : 'Employee',
        email: currentUser.email
      };
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // Get filtered documents based on search and category
  get filteredDocuments(): any[] {
    let docs = [...this.allDocuments];
    
    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      docs = docs.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        (doc.description && doc.description.toLowerCase().includes(query)) ||
        (doc.category && doc.category.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (this.selectedCategory !== 'All') {
      docs = docs.filter(doc => doc.category === this.selectedCategory);
    }
    
    return docs;
  }

  // For template compatibility - returns empty array since we're not using folders in this simplified view
  get filteredFolders(): any[] {
    return [];
  }

  // Placeholder methods for template compatibility
  navigateBackToRoot(): void {
    // Simplified - no folder navigation
  }

  navigateBackTo(index: number): void {
    // Simplified - no folder navigation
  }

  drillDownIntoFolder(folder: any): void {
    // Simplified - no folder navigation
  }

  async downloadDocument(doc: any): Promise<void> {
    try {
      const blob = await this.state.downloadDocument(doc.document_id);
      if (blob) {
        // Browser native download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(`Downloading: ${doc.title}`);
      } else {
        alert('You do not have permission to download this document.');
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download document. Please try again.');
    }
  }

  simulateDownload(doc: any): void {
    this.downloadDocument(doc);
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