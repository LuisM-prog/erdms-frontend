import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface FolderNode {
  folder_id: number;
  folder_name: string;
  created_by: number;
  created_by_name?: string;
  permissions: 'public' | 'private' | 'restricted';
  parent_id: number | null;
  subfolders: FolderNode[];
  documents: DocumentItem[];
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

@Component({
  selector: 'app-document-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-explorer.html',
  styleUrl: './document-explorer.css'
})
export class DocumentExplorerComponent implements OnInit {
  // User Info
  userInfo = { name: 'Loading...', position: 'Employee', email: '', user_id: 0 };
  profilePicture: string | null = null;
  
  // Data
  allFolders: any[] = [];
  allDocuments: any[] = [];
  folderTree: FolderNode[] = [];
  currentFolder: FolderNode | null = null;
  navigationPath: FolderNode[] = [];
  
  // Search and Filter
  searchQuery = '';
  selectedCategory = 'All';
  isLoading = true;
  errorMessage = '';
  
  // Preview Modal
  showPreviewModal = false;
  selectedDocForPreview: DocumentItem | null = null;
  previewUrl: SafeResourceUrl | null = null;
  isPreviewLoading = false;

  constructor(
    private router: Router,
    private state: StateService,
    public auth: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  async ngOnInit() {
    await this.loadUserInfo();
    await this.loadData();
    this.loadProfilePicture();
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

  loadProfilePicture() {
    const userId = this.auth.currentUser()?.user_id;
    if (userId) {
      const savedPicture = localStorage.getItem(`profile_pic_${userId}`);
      if (savedPicture && savedPicture.startsWith('data:image')) {
        this.profilePicture = savedPicture;
      }
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
      
      if (this.folderTree.length > 0) {
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
        parent_id: folder.parent_id || null,
        subfolders: [],
        documents: []
      });
    });

    this.allFolders.forEach((folder: any) => {
      const node = folderMap.get(folder.folder_id);
      if (node) {
        if (folder.parent_id && folderMap.has(folder.parent_id)) {
          const parent = folderMap.get(folder.parent_id);
          if (parent) {
            parent.subfolders.push(node);
          }
        } else {
          roots.push(node);
        }
      }
    });

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

    const sortFolders = (nodes: FolderNode[]) => {
      nodes.sort((a, b) => a.folder_name.localeCompare(b.folder_name));
      nodes.forEach(node => sortFolders(node.subfolders));
    };
    sortFolders(roots);

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

  selectFolder(folder: FolderNode) {
    this.currentFolder = folder;
    
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
    let subfolders = [...this.currentFolder.subfolders];
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      subfolders = subfolders.filter(f => 
        f.folder_name.toLowerCase().includes(query)
      );
    }
    
    return subfolders;
  }

  getCurrentDocuments(): DocumentItem[] {
    if (!this.currentFolder) return [];
    let docs = [...this.currentFolder.documents];
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      docs = docs.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        (doc.description && doc.description.toLowerCase().includes(query))
      );
    }
    
    if (this.selectedCategory !== 'All') {
      docs = docs.filter(doc => doc.category === this.selectedCategory);
    }
    
    return docs;
  }

  // Preview Document
  async openPreview(doc: DocumentItem) {
    console.log('Opening preview for:', doc.title);
    this.selectedDocForPreview = doc;
    this.showPreviewModal = true;
    this.isPreviewLoading = true;
    this.previewUrl = null;
    
    try {
      const blob = await this.state.downloadDocument(doc.document_id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        console.log('Preview loaded successfully');
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
      // Revoke the object URL when closing
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
        alert(`Downloading: ${doc.title}`);
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

  getProfilePicture(): string | null {
    return this.profilePicture;
  }

  getInitial(): string {
    return this.userInfo.name?.charAt(0).toUpperCase() || 'U';
  }

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
}