import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';
import { PermissionService } from '../../../services/permission.service';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { AdminHeaderComponent } from '../../../components/admin-header/admin-header.component';
import { UserSelectorComponent } from '../../../components/user-selector/user-selector.component';

interface FolderNode {
  folder_id: number;
  folder_name: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  permissions: 'public' | 'restricted' | 'private';
  parent_folder_id: number | null;
  subfolders: FolderNode[];
  documents: any[];
  isExpanded: boolean;
}

interface SearchResult {
  type: 'folder' | 'document';
  id: number;
  name: string;
  path: string;
  parent_id: number;
  folder_name?: string;
  category?: string;
  file_type?: string;
  created_at: string;
  created_by?: string;
  permission?: string;
}

@Component({
  selector: 'app-folder-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, AdminHeaderComponent, UserSelectorComponent],
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
  showUserSelector = false;
  isSubfolderMode = false;
  isEditingPermissions = false;  // ADD THIS PROPERTY
  parentFolderId: number | null = null;
  parentFolderName: string = '';
  isLoading = false;
  errorMessage = '';
  
  // Search
  searchQuery = '';
  searchResults: SearchResult[] = [];
  isSearching = false;
  expandedFolders: Set<number> = new Set();
  
  // Form fields for Create Modal
  createFolderName = '';
  createFolderPermission: 'public' | 'restricted' | 'private' = 'public';
  selectedUserIds: number[] = [];
  userSelectorMode: 'restricted' | 'private' = 'restricted';
  
  // Form fields for Edit Permission Modal
  editFolderName = '';
  editFolderPermission: 'public' | 'restricted' | 'private' = 'public';
  editSelectedUserIds: number[] = [];
  editExistingGrantedUsers: number[] = [];
  originalPermissionWasPublic = false;
  showEditPermissionModal = false;
  editingFolder: FolderNode | null = null;
  
  // Document upload fields
  inputDocTitle = '';
  inputDocDescription = '';
  inputDocCategory = 'General';
  inputDocAccessibility: 'public' | 'restricted' | 'private' = 'public';
  selectedDocUserIds: number[] = [];
  selectedFile: File | null = null;

  // Permission info
  showPermissionInfo = false;
  permissionInfoMessage = '';

  constructor(
    private router: Router,
    public state: StateService,
    public auth: AuthService,
    private permissionService: PermissionService
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
        isExpanded: false
      });
    });

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

    const sortFolders = (nodes: FolderNode[]) => {
      nodes.sort((a, b) => a.folder_name.localeCompare(b.folder_name));
      nodes.forEach(node => sortFolders(node.subfolders));
    };
    sortFolders(roots);

    this.documents.forEach((doc: any) => {
      const folderNode = folderMap.get(doc.folder_id);
      if (folderNode) {
        folderNode.documents.push(doc);
      }
    });

    this.folderTree = roots;
  }

  // ============================================
  // SEARCH FUNCTIONALITY (File Explorer Style)
  // ============================================

  async performSearch() {
    if (!this.searchQuery.trim()) {
      this.clearSearch();
      return;
    }
    
    this.isSearching = true;
    const query = this.searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    
    // Build path map for folders
    const getFolderPath = (folderId: number, currentPath: string = ''): string => {
      const folder = this.folders.find(f => f.folder_id === folderId);
      if (!folder) return currentPath;
      const parentPath = folder.parent_folder_id ? getFolderPath(folder.parent_folder_id) : '';
      return parentPath ? `${parentPath} / ${folder.folder_name}` : folder.folder_name;
    };
    
    // Search folders
    for (const folder of this.folders) {
      if (folder.folder_name.toLowerCase().includes(query)) {
        results.push({
          type: 'folder',
          id: folder.folder_id,
          name: folder.folder_name,
          path: getFolderPath(folder.folder_id),
          parent_id: folder.parent_folder_id || 0,
          created_at: folder.created_at,
          created_by: folder.created_by_name,
          permission: folder.permissions
        });
      }
    }
    
    // Search documents
    for (const doc of this.documents) {
      if (doc.title.toLowerCase().includes(query) || 
          (doc.description && doc.description.toLowerCase().includes(query)) ||
          (doc.category && doc.category.toLowerCase().includes(query))) {
        const folder = this.folders.find(f => f.folder_id === doc.folder_id);
        results.push({
          type: 'document',
          id: doc.document_id,
          name: doc.title,
          path: folder ? getFolderPath(folder.folder_id) : 'Unknown',
          parent_id: doc.folder_id,
          folder_name: folder?.folder_name,
          category: doc.category,
          file_type: doc.file_type,
          created_at: doc.created_at,
          created_by: doc.uploaded_by_name,
          permission: doc.accessibility
        });
      }
    }
    
    // Sort results by name
    results.sort((a, b) => a.name.localeCompare(b.name));
    this.searchResults = results;
  }

  clearSearch() {
    this.searchQuery = '';
    this.isSearching = false;
    this.searchResults = [];
  }

  onSearchInput() {
    if (!this.searchQuery.trim()) {
      this.clearSearch();
    } else {
      this.performSearch();
    }
  }

  navigateToResult(result: SearchResult) {
    this.clearSearch();
    
    if (result.type === 'folder') {
      const folder = this.findFolderInTree(result.id);
      if (folder) {
        this.selectFolder(folder);
      }
    } else {
      const folder = this.findFolderInTree(result.parent_id);
      if (folder) {
        this.selectFolder(folder);
      }
    }
  }

  findFolderInTree(folderId: number): FolderNode | null {
    const search = (nodes: FolderNode[]): FolderNode | null => {
      for (const node of nodes) {
        if (node.folder_id === folderId) return node;
        if (node.subfolders.length > 0) {
          const found = search(node.subfolders);
          if (found) return found;
        }
      }
      return null;
    };
    return search(this.folderTree);
  }

  getFolderResults(): SearchResult[] {
    return this.searchResults.filter(r => r.type === 'folder');
  }

  getDocumentResults(): SearchResult[] {
    return this.searchResults.filter(r => r.type === 'document');
  }

  async downloadDocumentById(documentId: number) {
    try {
      const doc = this.documents.find(d => d.document_id === documentId);
      if (doc) {
        await this.downloadDocument(doc);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download document.');
    }
  }

  // ============================================
  // EXPAND/COLLAPSE METHODS
  // ============================================

  toggleFolder(folder: FolderNode, event: Event) {
    event.stopPropagation();
    folder.isExpanded = !folder.isExpanded;
    if (folder.isExpanded) {
      this.expandedFolders.add(folder.folder_id);
    } else {
      this.expandedFolders.delete(folder.folder_id);
    }
  }

  toggleFolderExpand(folder: FolderNode, event: Event) {
    this.toggleFolder(folder, event);
  }

  isFolderExpanded(folderId: number): boolean {
    return this.expandedFolders.has(folderId);
  }

  hasSubfolders(folder: FolderNode): boolean {
    return folder.subfolders && folder.subfolders.length > 0;
  }

  expandAll() {
    const expandAllFolders = (nodes: FolderNode[]) => {
      nodes.forEach(node => {
        node.isExpanded = true;
        this.expandedFolders.add(node.folder_id);
        if (node.subfolders.length > 0) {
          expandAllFolders(node.subfolders);
        }
      });
    };
    expandAllFolders(this.folderTree);
  }

  collapseAll() {
    const collapseAllFolders = (nodes: FolderNode[]) => {
      nodes.forEach(node => {
        node.isExpanded = false;
        this.expandedFolders.delete(node.folder_id);
        if (node.subfolders.length > 0) {
          collapseAllFolders(node.subfolders);
        }
      });
    };
    collapseAllFolders(this.folderTree);
  }

  // ============================================
  // FOLDER SELECTION
  // ============================================

  selectFolder(folder: FolderNode) {
    this.selectedFolder = folder;
  }

  getCurrentDocuments(): any[] {
    if (!this.selectedFolder) return [];
    return this.selectedFolder.documents;
  }

  getCurrentSubfolders(): FolderNode[] {
    if (!this.selectedFolder) return [];
    return this.selectedFolder.subfolders;
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

  // ============================================
  // LOAD GRANTED USERS
  // ============================================

  async loadGrantedUsersForFolder(folderId: number): Promise<number[]> {
    try {
      const accessList = await this.permissionService.getFolderAccessList(folderId);
      return accessList.map(item => item.user_id);
    } catch (error) {
      console.error('Failed to load granted users:', error);
      return [];
    }
  }

  // ============================================
  // OPEN EDIT PERMISSION MODAL
  // ============================================

  async openEditPermissionModal() {
    if (!this.selectedFolder) return;
    
    const grantedUsers = await this.loadGrantedUsersForFolder(this.selectedFolder.folder_id);
    
    this.editingFolder = this.selectedFolder;
    this.editFolderName = this.selectedFolder.folder_name;
    this.editFolderPermission = this.selectedFolder.permissions;
    this.editSelectedUserIds = [...grantedUsers];
    this.editExistingGrantedUsers = [...grantedUsers];
    this.originalPermissionWasPublic = this.selectedFolder.permissions === 'public';
    
    this.showEditPermissionModal = true;
  }

  async confirmEditPermission() {
    if (!this.editingFolder) return;
    
    this.isLoading = true;
    
    const success = await this.state.updateFolder(this.editingFolder.folder_id, {
      folder_name: this.editFolderName.trim(),
      permissions: this.editFolderPermission
    });
    
    if (success) {
      if (this.editFolderPermission === 'public') {
        for (const userId of this.editExistingGrantedUsers) {
          await this.permissionService.revokeFolderAccess(this.editingFolder.folder_id, userId);
        }
        if (this.editExistingGrantedUsers.length > 0) {
          this.permissionInfoMessage = `Folder changed to Public. All permission grants have been removed.`;
          this.showPermissionInfo = true;
          setTimeout(() => {
            this.showPermissionInfo = false;
          }, 3000);
        }
      } else {
        const currentUserIds = this.editExistingGrantedUsers;
        const newUserIds = this.editSelectedUserIds;
        
        const toRemove = currentUserIds.filter(id => !newUserIds.includes(id));
        const toAdd = newUserIds.filter(id => !currentUserIds.includes(id));
        
        for (const userId of toRemove) {
          await this.permissionService.revokeFolderAccess(this.editingFolder.folder_id, userId);
        }
        
        for (const userId of toAdd) {
          await this.permissionService.grantFolderAccess(this.editingFolder.folder_id, userId, 'view');
        }
        
        if (toRemove.length > 0 || toAdd.length > 0) {
          this.permissionInfoMessage = `Permissions updated: ${toAdd.length} user(s) added, ${toRemove.length} user(s) removed.`;
          this.showPermissionInfo = true;
          setTimeout(() => {
            this.showPermissionInfo = false;
          }, 3000);
        }
      }
      
      if (this.selectedFolder && this.selectedFolder.folder_id === this.editingFolder.folder_id) {
        this.selectedFolder.folder_name = this.editFolderName;
        this.selectedFolder.permissions = this.editFolderPermission;
      }
      
      await this.loadData();
      this.showEditPermissionModal = false;
      this.editingFolder = null;
      alert('Folder updated successfully!');
    } else {
      alert('Failed to update folder');
    }
    this.isLoading = false;
  }

  cancelEditPermission() {
    this.showEditPermissionModal = false;
    this.editingFolder = null;
  }

  // ============================================
  // CREATE FOLDER
  // ============================================

  openCreateSubfolderModal(parentFolder: FolderNode) {
    this.isSubfolderMode = true;
    this.isEditingPermissions = false;
    this.parentFolderId = parentFolder.folder_id;
    this.parentFolderName = parentFolder.folder_name;
    this.createFolderName = '';
    this.createFolderPermission = 'public';
    this.selectedUserIds = [];
    this.showFolderModal = true;
  }

  onCreatePermissionChange() {
    if (this.createFolderPermission === 'restricted') {
      this.userSelectorMode = 'restricted';
      this.showUserSelector = true;
    } else if (this.createFolderPermission === 'private') {
      this.userSelectorMode = 'private';
      this.showUserSelector = true;
    }
  }

  openCreateUserSelector() {
    if (this.createFolderPermission === 'restricted') {
      this.userSelectorMode = 'restricted';
    } else if (this.createFolderPermission === 'private') {
      this.userSelectorMode = 'private';
    }
    this.showUserSelector = true;
  }

  onUsersSelected(userIds: number[]) {
    this.selectedUserIds = userIds;
    this.showUserSelector = false;
    
    if (userIds.length > 0) {
      this.permissionInfoMessage = `${userIds.length} user(s) will be granted access.`;
      this.showPermissionInfo = true;
      setTimeout(() => {
        this.showPermissionInfo = false;
      }, 3000);
    }
  }

  selectNone() {
    this.selectedUserIds = [];
    this.showUserSelector = false;
    this.permissionInfoMessage = 'No users selected. This will be private only to you.';
    this.showPermissionInfo = true;
    setTimeout(() => {
      this.showPermissionInfo = false;
    }, 3000);
  }

  async createFolder() {
    if (!this.createFolderName.trim()) {
      alert('Folder name is required');
      return;
    }
    
    this.isLoading = true;
    
    const folderData: any = {
      folder_name: this.createFolderName.trim(),
      permissions: this.createFolderPermission
    };
    
    if (this.isSubfolderMode && this.parentFolderId) {
      folderData.parent_folder_id = this.parentFolderId;
    }
    
    const result = await this.state.createFolderWithParent(folderData);
    
    if (result && result.folder_id) {
      if ((this.createFolderPermission === 'restricted' || this.createFolderPermission === 'private') && this.selectedUserIds.length > 0) {
        for (const userId of this.selectedUserIds) {
          await this.permissionService.grantFolderAccess(result.folder_id, userId, 'view');
        }
      }
      
      alert(`Folder "${this.createFolderName}" created successfully!`);
      await this.loadData();
      this.showFolderModal = false;
      this.selectedUserIds = [];
    } else {
      alert('Failed to create folder.');
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

  // ============================================
  // EDIT PERMISSION USER SELECTOR
  // ============================================

  openEditUserSelector() {
    if (this.editFolderPermission === 'restricted') {
      this.userSelectorMode = 'restricted';
    } else if (this.editFolderPermission === 'private') {
      this.userSelectorMode = 'private';
    }
    this.showUserSelector = true;
  }

  onEditUsersSelected(userIds: number[]) {
    this.editSelectedUserIds = userIds;
    this.showUserSelector = false;
    
    this.permissionInfoMessage = `${userIds.length} user(s) will have access after confirmation.`;
    this.showPermissionInfo = true;
    setTimeout(() => {
      this.showPermissionInfo = false;
    }, 3000);
  }

  // ============================================
  // DOCUMENT METHODS
  // ============================================

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
    this.inputDocAccessibility = 'public';
    this.selectedDocUserIds = [];
    this.selectedFile = null;
    this.showDocModal = true;
  }

  onDocPermissionChange() {
    if (this.inputDocAccessibility === 'restricted') {
      this.userSelectorMode = 'restricted';
      this.showUserSelector = true;
    } else if (this.inputDocAccessibility === 'private') {
      this.userSelectorMode = 'private';
      this.showUserSelector = true;
    }
  }

  openDocUserSelector() {
    if (this.inputDocAccessibility === 'restricted') {
      this.userSelectorMode = 'restricted';
    } else if (this.inputDocAccessibility === 'private') {
      this.userSelectorMode = 'private';
    }
    this.showUserSelector = true;
  }

  selectDocNone() {
    this.selectedDocUserIds = [];
    this.showUserSelector = false;
    this.permissionInfoMessage = 'No users selected. This document will be private only to you.';
    this.showPermissionInfo = true;
    setTimeout(() => {
      this.showPermissionInfo = false;
    }, 3000);
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
    
    if (result && result.document_id) {
      if ((this.inputDocAccessibility === 'restricted' || this.inputDocAccessibility === 'private') && this.selectedDocUserIds.length > 0) {
        for (const userId of this.selectedDocUserIds) {
          await this.permissionService.grantFolderAccess(this.selectedFolder!.folder_id, userId, 'view');
        }
      }
      
      alert(`Document "${this.inputDocTitle}" uploaded successfully!`);
      await this.loadData();
      this.showDocModal = false;
      this.selectedDocUserIds = [];
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

  // ============================================
  // HELPER METHODS
  // ============================================

  getFolderIcon(folder: FolderNode): string {
    return folder.subfolders.length > 0 ? '📂' : '📁';
  }

  getPermissionIcon(permission: string): string {
    switch (permission) {
      case 'public': return '🌍';
      case 'restricted': return '🔒';
      case 'private': return '⚠️';
      default: return '📁';
    }
  }

  getPermissionLabel(permission: string): string {
    switch (permission) {
      case 'public': return 'Public';
      case 'restricted': return 'Restricted';
      case 'private': return 'Private';
      default: return permission;
    }
  }

  getPermissionTooltip(permission: string): string {
    switch (permission) {
      case 'public':
        return 'Public: Everyone can access this folder';
      case 'restricted':
        return 'Restricted: Admins and granted employees can access.';
      case 'private':
        return 'Private: Only explicitly granted users can access. Admins need permission too.';
      default:
        return '';
    }
  }

  // ============================================
  // NAVIGATION
  // ============================================

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