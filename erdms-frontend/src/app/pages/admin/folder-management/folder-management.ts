import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';

interface FolderNode {
  folder_id: number;
  folder_name: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  permissions: 'public' | 'private' | 'restricted';
  parent_id: number | null;
  subfolders: FolderNode[];
  documents: any[];
}

@Component({
  selector: 'app-folder-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './folder-management.html',
  styleUrls: ['./folder-management.css']
})
export class FolderManagementComponent implements OnInit {
  // Data
  folders: any[] = [];
  documents: any[] = [];
  folderTree: FolderNode[] = [];
  selectedFolder: FolderNode | null = null;
  
  // UI State
  showFolderModal = false;
  showDocModal = false;
  isSubfolderMode = false;
  parentFolderId: number | null = null;
  isLoading = false;
  errorMessage = '';
  
  // Search and Filter
  searchQuery = '';
  
  // Form fields
  inputFolderName = '';
  inputFolderPermission = 'public';
  
  inputDocTitle = '';
  inputDocDescription = '';
  inputDocCategory = 'General';
  inputDocAccessibility = 'public';
  selectedFile: File | null = null;

  constructor(
    private router: Router,
    public state: StateService,
    public auth: AuthService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const [folders, docs] = await Promise.all([
        this.state.getAllFolders(),
        this.state.getAllDocuments()
      ]);
      this.folders = folders;
      this.documents = docs;
      this.buildFolderTree();
      
      // Auto-select root folder
      if (this.folderTree.length > 0 && !this.selectedFolder) {
        this.selectedFolder = this.folderTree[0];
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load data';
    } finally {
      this.isLoading = false;
    }
  }

  buildFolderTree() {
    const folderMap = new Map<number, FolderNode>();
    const roots: FolderNode[] = [];

    // First, create all folder nodes
    this.folders.forEach(folder => {
      folderMap.set(folder.folder_id, {
        folder_id: folder.folder_id,
        folder_name: folder.folder_name,
        created_by: folder.created_by,
        created_by_name: folder.created_by_name,
        created_at: folder.created_at,
        permissions: folder.permissions,
        parent_id: null,
        subfolders: [],
        documents: []
      });
    });

    // Build hierarchy
    this.folders.forEach(folder => {
      const node = folderMap.get(folder.folder_id);
      if (node) {
        if (folder.parent_id && folderMap.has(folder.parent_id)) {
          const parent = folderMap.get(folder.parent_id);
          if (parent) {
            node.parent_id = folder.parent_id;
            parent.subfolders.push(node);
          }
        } else {
          roots.push(node);
        }
      }
    });

    // Add documents to folders
    this.documents.forEach(doc => {
      const folderNode = folderMap.get(doc.folder_id);
      if (folderNode) {
        folderNode.documents.push(doc);
      }
    });

    this.folderTree = roots;
  }

  selectFolder(folder: FolderNode) {
    this.selectedFolder = folder;
    this.isSubfolderMode = false;
    this.parentFolderId = null;
  }

  getCurrentDocuments(): any[] {
    if (!this.selectedFolder) return [];
    let docs = [...this.selectedFolder.documents];
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      docs = docs.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        (doc.description && doc.description.toLowerCase().includes(query))
      );
    }
    
    return docs;
  }

  getCurrentSubfolders(): FolderNode[] {
    if (!this.selectedFolder) return [];
    let subfolders = [...this.selectedFolder.subfolders];
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      subfolders = subfolders.filter(folder => 
        folder.folder_name.toLowerCase().includes(query)
      );
    }
    
    return subfolders;
  }

  openCreateRootFolderModal() {
    this.isSubfolderMode = false;
    this.parentFolderId = null;
    this.inputFolderName = '';
    this.inputFolderPermission = 'public';
    this.showFolderModal = true;
  }

  openCreateSubfolderModal(parentFolder: FolderNode) {
    this.isSubfolderMode = true;
    this.parentFolderId = parentFolder.folder_id;
    this.inputFolderName = '';
    this.inputFolderPermission = parentFolder.permissions;
    this.showFolderModal = true;
  }

  async createFolder() {
    if (!this.inputFolderName.trim()) {
      alert('Folder name is required');
      return;
    }
    
    this.isLoading = true;
    const result = await this.state.createFolder(
      this.inputFolderName.trim(),
      this.inputFolderPermission as 'public' | 'private' | 'restricted'
    );
    
    if (result) {
      alert(`Folder "${this.inputFolderName}" created successfully!`);
      await this.loadData();
      this.showFolderModal = false;
    } else {
      alert('Failed to create folder.');
    }
    this.isLoading = false;
  }

  async updateFolder() {
    if (!this.selectedFolder) return;
    if (!this.selectedFolder.folder_name.trim()) {
      alert('Folder name cannot be empty');
      return;
    }
    
    this.isLoading = true;
    const success = await this.state.updateFolder(this.selectedFolder.folder_id, {
      folder_name: this.selectedFolder.folder_name.trim(),
      permissions: this.selectedFolder.permissions
    });
    
    if (success) {
      alert('Folder updated successfully!');
      await this.loadData();
    } else {
      alert('Failed to update folder');
    }
    this.isLoading = false;
  }

  async deleteFolder(folder: FolderNode, event: Event) {
    event.stopPropagation();
    const docCount = folder.documents.length + folder.subfolders.length;
    if (confirm(`Delete "${folder.folder_name}" and all ${docCount} items inside?`)) {
      this.isLoading = true;
      const success = await this.state.deleteFolder(folder.folder_id);
      if (success) {
        alert(`Folder "${folder.folder_name}" deleted.`);
        if (this.selectedFolder?.folder_id === folder.folder_id) {
          this.selectedFolder = this.folderTree[0];
        }
        await this.loadData();
      } else {
        alert('Failed to delete folder');
      }
      this.isLoading = false;
    }
  }

  openUploadModal() {
    if (!this.selectedFolder) {
      alert('Please select a folder first');
      return;
    }
    if (this.selectedFolder.folder_id === 1) {
      alert('Cannot upload to Root folder. Please select a subfolder.');
      return;
    }
    this.inputDocTitle = '';
    this.inputDocDescription = '';
    this.inputDocCategory = 'General';
    this.inputDocAccessibility = this.selectedFolder.permissions;
    this.selectedFile = null;
    this.showDocModal = true;
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile && !this.inputDocTitle) {
      this.inputDocTitle = this.selectedFile.name.replace(/\.[^/.]+$/, '');
    }
  }

  async uploadDocument() {
    if (!this.selectedFolder) {
      alert('Please select a folder first');
      return;
    }
    if (!this.selectedFile) {
      alert('Please select a file to upload');
      return;
    }
    if (!this.inputDocTitle.trim()) {
      alert('Document title is required');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('title', this.inputDocTitle.trim());
    formData.append('description', this.inputDocDescription.trim());
    formData.append('category', this.inputDocCategory);
    formData.append('folder_id', this.selectedFolder.folder_id.toString());
    formData.append('accessibility', this.inputDocAccessibility);
    
    this.isLoading = true;
    const result = await this.state.uploadDocument(formData);
    
    if (result) {
      alert(`Document "${this.inputDocTitle}" uploaded successfully!`);
      await this.loadData();
      this.showDocModal = false;
    } else {
      alert('Failed to upload document.');
    }
    this.isLoading = false;
  }

  async deleteDocument(doc: any, event: Event) {
    event.stopPropagation();
    if (confirm(`Delete "${doc.title}"?`)) {
      this.isLoading = true;
      const success = await this.state.deleteDocument(doc.document_id);
      if (success) {
        alert(`Document "${doc.title}" deleted.`);
        await this.loadData();
      } else {
        alert('Failed to delete document');
      }
      this.isLoading = false;
    }
  }

  downloadDocument(doc: any) {
    window.open(`http://localhost:4000/api/documents/${doc.document_id}/download`, '_blank');
  }

  getPermissionIcon(permission: string): string {
    switch (permission) {
      case 'public': return '🌍';
      case 'private': return '🔒';
      case 'restricted': return '⚠️';
      default: return '📁';
    }
  }

  getPermissionLabel(permission: string): string {
    switch (permission) {
      case 'public': return 'Public';
      case 'private': return 'Private';
      case 'restricted': return 'Restricted';
      default: return permission;
    }
  }

  getFolderIcon(folder: FolderNode): string {
    return folder.subfolders.length > 0 ? '📂' : '📁';
  }

  // Navigation
  navToDashboard() { this.router.navigate(['/admin/dashboard']); }
  navToDocManagement() { this.router.navigate(['/admin/folder-management']); }
  navToUserManagement() { this.router.navigate(['/admin/user-management']); }
  navToAuditLogs() { this.router.navigate(['/admin/audit-logs']); }
}