import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';
import { PermissionService } from '../../../services/permission.service';
import { UserSidebarComponent } from '../../../components/user-sidebar/user-sidebar.component';
import { UserHeaderComponent } from '../../../components/user-header/user-header.component';

interface FolderNode {
  folder_id: number;
  folder_name: string;
  created_by: number;
  created_by_name?: string;
  permissions: 'public' | 'restricted' | 'private';
  parent_folder_id: number | null;
  subfolders: FolderNode[];
  documents: DocumentItem[];
  isExpanded: boolean;
}

interface DocumentItem {
  document_id: number;
  title: string;
  description: string | null;
  category: string | null;
  file_path: string;
  file_type?: string;
  accessibility: string;
  folder_id: number;
  uploaded_by: number;
  uploaded_by_name?: string;
  created_at: string;
  file_size?: number;
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
}

@Component({
  selector: 'app-document-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, UserSidebarComponent, UserHeaderComponent],
  templateUrl: './document-explorer.html',
  styleUrl: './document-explorer.css'
})
export class DocumentExplorerComponent implements OnInit {
  // User Info
  userInfo = { name: 'Loading...', position: 'Employee', email: '', user_id: 0 };
  
  // Data
  allFolders: any[] = [];
  allDocuments: any[] = [];
  folderTree: FolderNode[] = [];
  currentFolder: FolderNode | null = null;
  navigationPath: FolderNode[] = [];
  
  // Search
  searchQuery = '';
  searchResults: SearchResult[] = [];
  isSearching = false;
  selectedCategory = 'All';
  isLoading = true;
  errorMessage = '';
  
  // Preview Modal
  showPreviewModal = false;
  selectedDocForPreview: DocumentItem | null = null;
  previewUrl: SafeResourceUrl | null = null;
  isPreviewLoading = false;
  
  // Access Request Modal
  showRequestModal = false;
  requestTargetType: 'folder' | 'document' = 'folder';
  requestTargetId: number = 0;
  requestTargetName: string = '';
  requestedPermission: 'view' | 'download' | 'both' = 'view';
  requestMessage: string = '';
  isRequesting = false;

  constructor(
    private router: Router,
    private state: StateService,
    public auth: AuthService,
    private permissionService: PermissionService,
    private sanitizer: DomSanitizer
  ) {}

  async ngOnInit() {
    await this.loadUserInfo();
    await this.loadData();
  }

  async loadUserInfo() {
    const currentUser = this.auth.currentUser();
    if (currentUser) {
      this.userInfo = {
        name: currentUser.name,
        position: currentUser.role === 'admin' ? 'Administrator' : 'Employee',
        email: currentUser.email,
        user_id: currentUser.user_id
      };
    }
  }

  async loadData() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const [folders, docs] = await Promise.all([
        this.state.getAllFolders(),
        this.state.getAllDocuments()
      ]);
      
      this.allFolders = folders;
      this.allDocuments = docs;
      this.buildFolderTree();
      
      if (this.folderTree.length > 0 && !this.currentFolder) {
        this.selectFolder(this.folderTree[0]);
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load documents';
      console.error('Load error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  buildFolderTree() {
    const folderMap = new Map<number, FolderNode>();
    const roots: FolderNode[] = [];

    this.allFolders.forEach((folder: any) => {
      folderMap.set(folder.folder_id, {
        folder_id: folder.folder_id,
        folder_name: folder.folder_name,
        created_by: folder.created_by,
        created_by_name: folder.created_by_name,
        permissions: folder.permissions,
        parent_folder_id: folder.parent_folder_id || null,
        subfolders: [],
        documents: [],
        isExpanded: false
      });
    });

    this.allFolders.forEach((folder: any) => {
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

    this.allDocuments.forEach((doc: any) => {
      const hasAccess = this.checkDocumentAccess(doc);
      if (hasAccess) {
        const folderNode = folderMap.get(doc.folder_id);
        if (folderNode) {
          folderNode.documents.push({
            document_id: doc.document_id,
            title: doc.title,
            description: doc.description || '',
            category: doc.category || 'General',
            file_path: doc.file_path,
            file_type: doc.file_type,
            accessibility: doc.accessibility,
            folder_id: doc.folder_id,
            uploaded_by: doc.uploaded_by,
            uploaded_by_name: doc.uploaded_by_name,
            created_at: doc.created_at,
            file_size: doc.file_size
          });
        }
      }
    });

    this.folderTree = roots;
  }

  checkDocumentAccess(doc: any): boolean {
    if (this.userInfo.position === 'Administrator') {
      return true;
    }
    
    const folder = this.allFolders.find((f: any) => f.folder_id === doc.folder_id);
    if (!folder) return false;
    
    if (folder.permissions === 'public') {
      return true;
    }
    
    if (doc.uploaded_by === this.userInfo.user_id) {
      return true;
    }
    
    return false;
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
      const folder = this.allFolders.find(f => f.folder_id === folderId);
      if (!folder) return currentPath;
      const parentPath = folder.parent_folder_id ? getFolderPath(folder.parent_folder_id) : '';
      return parentPath ? `${parentPath} / ${folder.folder_name}` : folder.folder_name;
    };
    
    // Search folders
    for (const folder of this.allFolders) {
      if (folder.folder_name.toLowerCase().includes(query)) {
        results.push({
          type: 'folder',
          id: folder.folder_id,
          name: folder.folder_name,
          path: getFolderPath(folder.folder_id),
          parent_id: folder.parent_folder_id || 0,
          created_at: folder.created_at
        });
      }
    }
    
    // Search documents
    for (const doc of this.allDocuments) {
      const hasAccess = this.checkDocumentAccess(doc);
      if (hasAccess && (doc.title.toLowerCase().includes(query) || 
          (doc.description && doc.description.toLowerCase().includes(query)) ||
          (doc.category && doc.category.toLowerCase().includes(query)))) {
        const folder = this.allFolders.find(f => f.folder_id === doc.folder_id);
        results.push({
          type: 'document',
          id: doc.document_id,
          name: doc.title,
          path: folder ? getFolderPath(folder.folder_id) : 'Unknown',
          parent_id: doc.folder_id,
          folder_name: folder?.folder_name,
          category: doc.category,
          file_type: doc.file_type,
          created_at: doc.created_at
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

  // Navigate to a search result
  async navigateToResult(result: SearchResult) {
    this.clearSearch();
    
    if (result.type === 'folder') {
      // Navigate to folder
      const folder = this.findFolderInTree(result.id);
      if (folder) {
        this.selectFolder(folder);
      }
    } else {
      // Navigate to document's parent folder
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

  // ============================================
  // FOLDER NAVIGATION
  // ============================================

  toggleFolder(folder: FolderNode, event: Event) {
    event.stopPropagation();
    folder.isExpanded = !folder.isExpanded;
  }

  toggleFolderExpand(folder: FolderNode, event: Event) {
    this.toggleFolder(folder, event);
  }

  isFolderExpanded(folderId: number): boolean {
    const folder = this.findFolderInTree(folderId);
    return folder ? folder.isExpanded : false;
  }

  hasSubfolders(folder: FolderNode): boolean {
    return folder.subfolders && folder.subfolders.length > 0;
  }

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
    this.currentFolder = folder;
    
    // Build navigation path
    this.navigationPath = [];
    const buildPath = (nodes: FolderNode[], target: FolderNode, path: FolderNode[]): boolean => {
      for (const node of nodes) {
        path.push(node);
        if (node.folder_id === target.folder_id) return true;
        if (buildPath(node.subfolders, target, path)) return true;
        path.pop();
      }
      return false;
    };
    
    buildPath(this.folderTree, folder, this.navigationPath);
  }

  navigateToRoot() {
    if (this.folderTree.length > 0) {
      this.selectFolder(this.folderTree[0]);
    }
  }

  navigateToFolder(index: number) {
    if (this.navigationPath[index]) {
      this.selectFolder(this.navigationPath[index]);
    }
  }

  getCurrentSubfolders(): FolderNode[] {
    if (!this.currentFolder) return [];
    return this.currentFolder.subfolders;
  }

  getCurrentDocuments(): DocumentItem[] {
    if (!this.currentFolder) return [];
    let docs = [...this.currentFolder.documents];
    
    if (this.selectedCategory !== 'All') {
      docs = docs.filter(doc => doc.category === this.selectedCategory);
    }
    
    return docs;
  }

  // ============================================
  // PERMISSION HELPERS
  // ============================================

  getPermissionLabel(permission: string): string {
    switch (permission) {
      case 'public': return 'Public';
      case 'restricted': return 'Restricted';
      case 'private': return 'Private';
      default: return permission;
    }
  }

  getPermissionIcon(permission: string): string {
    switch (permission) {
      case 'public': return '🌍';
      case 'restricted': return '🔒';
      case 'private': return '⚠️';
      default: return '📁';
    }
  }

  getPermissionTooltip(permission: string): string {
    switch (permission) {
      case 'public':
        return 'Public: Everyone can access this folder';
      case 'restricted':
        return 'Restricted: Admins and granted employees can access. You can request access.';
      case 'private':
        return 'Private: Only explicitly granted users can access. Admins need permission too. No requests allowed.';
      default:
        return '';
    }
  }

  // ============================================
  // ACCESS REQUEST METHODS
  // ============================================

  async openRequestAccessModal(targetType: 'folder' | 'document', targetId: number, targetName: string) {
    const hasAccess = await this.permissionService.checkItemAccess(targetType, targetId);
    if (hasAccess) {
      alert('You already have access to this item.');
      return;
    }
    
    this.requestTargetType = targetType;
    this.requestTargetId = targetId;
    this.requestTargetName = targetName;
    this.requestedPermission = 'view';
    this.requestMessage = '';
    this.showRequestModal = true;
  }

  closeRequestModal() {
    this.showRequestModal = false;
    this.requestTargetType = 'folder';
    this.requestTargetId = 0;
    this.requestTargetName = '';
    this.requestedPermission = 'view';
    this.requestMessage = '';
  }

  async submitAccessRequest() {
    this.isRequesting = true;
    const result = await this.permissionService.requestAccess(
      this.requestTargetType,
      this.requestTargetId,
      this.requestedPermission,
      this.requestMessage
    );
    
    if (result.success) {
      alert(`Access request submitted successfully! It will expire on ${new Date(result.expiresAt!).toLocaleDateString()}. Super Admin will review your request.`);
      this.closeRequestModal();
    } else {
      alert('Failed to submit request. You may already have a pending request.');
    }
    this.isRequesting = false;
  }

  // ============================================
  // PREVIEW METHODS
  // ============================================

  async openPreview(doc: DocumentItem) {
    this.selectedDocForPreview = doc;
    this.showPreviewModal = true;
    this.isPreviewLoading = true;
    this.previewUrl = null;
    
    try {
      const blob = await this.state.downloadDocument(doc.document_id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else {
        this.errorMessage = 'Unable to preview document';
      }
    } catch (error) {
      console.error('Preview failed:', error);
      this.errorMessage = 'Failed to load document preview';
    } finally {
      this.isPreviewLoading = false;
    }
  }

  closePreviewModal() {
    if (this.previewUrl) {
      const url = this.previewUrl.toString();
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    this.showPreviewModal = false;
    this.selectedDocForPreview = null;
    this.previewUrl = null;
  }

  async downloadFromPreview() {
    if (this.selectedDocForPreview) {
      await this.downloadDocument(this.selectedDocForPreview);
      this.closePreviewModal();
    }
  }

  async downloadDocument(doc: DocumentItem) {
    try {
      const blob = await this.state.downloadDocument(doc.document_id);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileExt = doc.file_type?.split('/')[1] || 'pdf';
        const fileName = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExt}`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('You do not have permission to download this document.');
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download document.');
    }
  }

  getFolderIcon(folder: FolderNode): string {
    return folder.subfolders.length > 0 ? '📂' : '📁';
  }

  getFileTypeIcon(fileType?: string): string {
    if (!fileType) return '📄';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('word') || fileType.includes('doc')) return '📘';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📗';
    return '📄';
  }

  getDocumentType(fileType?: string): string {
    if (!fileType) return 'DOC';
    const type = fileType.split('/')[1];
    return type ? type.toUpperCase() : 'DOC';
  }

  // ============================================
  // NAVIGATION
  // ============================================

  goToDashboard() {
    this.router.navigate(['/user/dashboard']);
  }

  goToDocuments() {
    this.router.navigate(['/user/document-management']);
  }

  goToProfile() {
    this.router.navigate(['/user/user-profile']);
  }

  executeSignOut() {
    if (confirm('Are you sure you want to log out?')) {
      this.auth.logout();
    }
  }
  
  getFolderResults(): SearchResult[] {
    return this.searchResults.filter(r => r.type === 'folder');
  }

  getDocumentResults(): SearchResult[] {
    return this.searchResults.filter(r => r.type === 'document');
  }

  async downloadSearchResult(result: SearchResult) {
    if (result.type === 'document') {
      const doc = this.allDocuments.find(d => d.document_id === result.id);
      if (doc) {
        await this.downloadDocument(doc as DocumentItem);
      }
    }
  }
}