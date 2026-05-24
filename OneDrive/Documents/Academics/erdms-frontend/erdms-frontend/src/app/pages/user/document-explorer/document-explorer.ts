import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService, FolderItem } from '../../../services/state';

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
  public userInfo: ActiveUserContext = { name: 'Jane Doe', position: 'Standard User', email: '' };
  public isDropdownOpen: boolean = false;
  
  // Search parameters for filtering matching folders/documents
  public searchQuery: string = '';
  public selectedCategory: string = 'All';

  // State variables for monitoring hierarchical tracking levels
  public currentFolderId: number | null = 1; // Default starting location matches Root Archive ID
  public navigationPath: any[] = [];          // Holds explicit trail structures for navigation path paths

  constructor(public router: Router, public state: StateService) {}

  ngOnInit(): void {
    // Resolve current authenticated session context from state pool
    const currentUID = this.state.currentUserUID;
    const activeUser = this.state.usersTable?.find(u => u.UID === currentUID) || 
                       this.state.usersTable?.find(u => u.UID === 3);

    if (activeUser) {
      this.userInfo = {
        name: activeUser.name,
        position: this.state.getRoleName(activeUser.role_id) || 'Standard User',
        email: activeUser.email
      };
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // 📁 Click Handler to go downstream into a child directory layer
  drillDownIntoFolder(folderItem: any): void {
    this.currentFolderId = folderItem.id;
    this.navigationPath.push({
      id: folderItem.id,
      name: folderItem.name || folderItem.title
    });
    this.searchQuery = ''; // Clear search parameters when shifting views
  }

  // ↖️ Navigation management to reset back up to root container bounds
  navigateBackToRoot(): void {
    this.currentFolderId = 1;
    this.navigationPath = [];
  }

  // ↖️ Navigation management to step back to specific breadcrumb tiers safely
  navigateBackTo(index: number): void {
    const targetFolder = this.navigationPath[index];
    if (targetFolder) {
      this.currentFolderId = targetFolder.id;
      this.navigationPath = this.navigationPath.slice(0, index + 1);
    }
  }

  // Get folders only for the current directory
  get filteredFolders(): FolderItem[] {
    return this.filteredDocs.filter(doc => doc.type === 'Folder');
  }

  // Get documents only for the current directory
  get filteredDocuments(): FolderItem[] {
    return this.filteredDocs.filter(doc => doc.type !== 'Folder');
  }

  // 🔍 Real-time Filtered Views Engine organized explicitly by parent folder boundaries
  get filteredDocs(): FolderItem[] {
    const rawData = this.state.foldersTable || [];
    const query = this.searchQuery.toLowerCase().trim();
    const currentUID = this.state.currentUserUID;

    return rawData.filter(doc => {
      // Only show items created by the current user or shared items (created_by: 1 for admin shares)
      if ((doc.created_by || 1) !== currentUID && (doc.created_by || 1) !== 1) {
        return false;
      }

      // Step A: Determine structural context alignment
      // If a global keyword string query is present, bypass structural constraints to scan the full environment
      if (!query) {
        const parentContextId = (doc as any).parentId || ((doc.type === 'Folder' && doc.id !== 1) ? 1 : null);
        
        if (this.currentFolderId === 1) {
          // At the root layer, show only components positioned at root level explicitly
          if (doc.id === 1) return false; // Don't show the root folder inside itself
          if (parentContextId !== null && parentContextId !== 1) return false;
        } else {
          // Inside a subfolder, show only elements whose parent context id matches the active container index
          if ((doc as any).folderId !== this.currentFolderId && parentContextId !== this.currentFolderId) {
            return false;
          }
        }
      }

      // Step B: Filter matching keywords
      const nameMatch = (doc.name || '').toLowerCase().includes(query) || 
                        (doc.title || '').toLowerCase().includes(query);
      const categoryMatch = (doc.category || '').toLowerCase().includes(query);
      const matchesSearch = query === '' || nameMatch || categoryMatch;
      
      // Step C: Filter matching categories
      const matchesCategory = this.selectedCategory === 'All' || 
                              this.selectedCategory === '' || 
                              doc.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  // 📥 Download Permitted Documents and write verification footprint to system logs
  simulateDownload(doc: FolderItem): void {
    const assetName = doc.name || doc.title || 'Unknown_File';
    const fullPath = this.getFullPath(doc);
    alert(`Initiating download for requested asset node:\n"${assetName}"\n\nLocation: ${fullPath}\n\nTransaction dispatched to the Global Audit Logs trace.`);
    
    const operatorUID = this.state.currentUserUID || 3;
    if (typeof this.state.writeLogEntry === 'function') {
      this.state.writeLogEntry(operatorUID, `Downloaded authorized folder/document asset: "${assetName}" from location: ${fullPath}`);
    }
  }

  // Helper: Builds the full hierarchical path for a document
  private getFullPath(doc: FolderItem): string {
    let path = doc.name || doc.title || 'Unknown';
    let parentId = (doc as any).parentId || (doc as any).folderId;
    
    while (parentId && parentId !== 1) {
      const parentItem = this.state.foldersTable?.find(f => f.id === parentId);
      if (!parentItem) break;
      path = (parentItem.name || parentItem.title) + ' / ' + path;
      parentId = (parentItem as any).parentId;
    }
    
    return '/Root / ' + path;
  }

  navigateToTab(routePath: string): void {
    this.router.navigate([routePath]);
  }

  executeSignOut(): void {
    if (confirm('Are you sure you want to log out of your session?')) {
      this.router.navigate(['/login']);
    }
  }
}