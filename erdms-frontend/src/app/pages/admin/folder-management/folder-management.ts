import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { AdminHeaderComponent } from '../../../components/admin-header/admin-header.component';

interface FolderNode {
  folder_id: number;
  folder_name: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  permissions: 'public' | 'private' | 'restricted';
  parent_folder_id: number | null;
  subfolders: FolderNode[];
  documents: any[];
  isExpanded: boolean;  // Add this for collapse/expand
}

@Component({
  selector: 'app-folder-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, AdminHeaderComponent],
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
  parentFolderName: string = '';
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
    this.folders.forEach((folder: any) => {
      folderMap.set(folder.folder_id, {
        folder_id: folder.folder_id,
        folder_name: folder.folder_name,
        created_by: folder.created_by,
        created_by_name: folder.created_by_name,
        created_at: folder.created_at,
        permissions: folder.permissions,
        parent_folder_id: folder.parent_folder_id || null,
        subfolders: [],
        documents: [],
        isExpanded: false  // Start collapsed
      });
    });

    // Build hierarchy - link children to parents using parent_folder_id
    this.folders.forEach((folder: any) => {
      const node = folderMap.get(folder.folder_id);
      if (node) {
        if (folder.parent_folder_id && folderMap.has(folder.parent_folder_id)) {
          const parent = folderMap.get(folder.parent_folder_id);
          if (parent) {
            parent.subfolders.push(node);
          }
        } else if (!folder.parent_folder_id) {
          roots.push(node);
        }
      }
    });

    // Sort subfolders alphabetically
    const sortSubfolders = (nodes: FolderNode[]) => {
      nodes.sort((a, b) => a.folder_name.localeCompare(b.folder_name));
      nodes.forEach(node => sortSubfolders(node.subfolders));
    };
    sortSubfolders(roots);

    // Add documents to folders
    this.documents.forEach((doc: any) => {
      const folderNode = folderMap.get(doc.folder_id);
      if (folderNode) {
        folderNode.documents.push(doc);
      }
    });

    this.folderTree = roots;
  }

  // Toggle folder expansion
  toggleFolder(folder: FolderNode, event: Event) {
    event.stopPropagation();
    folder.isExpanded = !folder.isExpanded;
  }

  // Expand all folders
  expandAll() {
    const expandAllFolders = (nodes: FolderNode[]) => {
      nodes.forEach(node => {
        node.isExpanded = true;
        if (node.subfolders.length > 0) {
          expandAllFolders(node.subfolders);
        }
      });
    };
    expandAllFolders(this.folderTree);
  }

  // Collapse all folders
  collapseAll() {
    const collapseAllFolders = (nodes: FolderNode[]) => {
      nodes.forEach(node => {
        node.isExpanded = false;
        if (node.subfolders.length > 0) {
          collapseAllFolders(node.subfolders);
        }
      });
    };
    collapseAllFolders(this.folderTree);
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

  getFolderPath(): FolderNode[] {
    const path: FolderNode[] = [];
    const findPath = (nodes: FolderNode[], target: FolderNode, currentPath: FolderNode[]): boolean => {
      for (const node of nodes) {
        currentPath.push(node);
        if (node.folder_id === target.folder_id) return true;
        if (findPath(node.subfolders, target, currentPath)) return true;
        currentPath.pop();
      }
      return false;
    };
    
    if (this.selectedFolder) {
      findPath(this.folderTree, this.selectedFolder, path);
    }
    return path;
  }

  openCreateRootFolderModal() {
    this.isSubfolderMode = false;
    this.parentFolderId = null;
    this.parentFolderName = '';
    this.inputFolderName = '';
    this.inputFolderPermission = 'public';
    this.showFolderModal = true;
  }

  openCreateSubfolderModal(parentFolder: FolderNode) {
    this.isSubfolderMode = true;
    this.parentFolderId = parentFolder.folder_id;
    this.parentFolderName = parentFolder.folder_name;
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
    
    const folderData: any = {
      folder_name: this.inputFolderName.trim(),
      permissions: this.inputFolderPermission as 'public' | 'private' | 'restricted'
    };
    
    if (this.isSubfolderMode && this.parentFolderId) {
      folderData.parent_folder_id = this.parentFolderId;
    }
    
    const result = await this.state.createFolderWithParent(folderData);
    
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
    const itemCount = folder.documents.length + folder.subfolders.length;
    if (confirm(`Delete "${folder.folder_name}" and all ${itemCount} items inside? This cannot be undone.`)) {
      this.isLoading = true;
      const success = await this.state.deleteFolder(folder.folder_id);
      if (success) {
        alert(`Folder "${folder.folder_name}" deleted.`);
        if (this.selectedFolder?.folder_id === folder.folder_id) {
          this.selectedFolder = this.folderTree[0] || null;
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
      default: return ' ';
    }
  }

  // Navigation
  navToDashboard() { this.router.navigate(['/admin/dashboard']); }
  navToDocManagement() { this.router.navigate(['/admin/folder-management']); }
  navToUserManagement() { this.router.navigate(['/admin/user-management']); }
  navToAuditLogs() { this.router.navigate(['/admin/audit-logs']); }

  executeSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      this.auth.logout();
    }
  }
}