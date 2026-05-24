import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';

interface DocumentEntity {
  document_id: number;
  title: string;
  description: string;
  category: string;
  file_path: string;
  accessibility: string;
  folder_id: number; 
  uploaded_by: number;
  created_at: string;
}

interface FolderNode {
  folder_id: number;
  folder_name: string;
  created_by: number;
  created_at: string;
  permission: string;
  parent_id: number | null;
  subfolders: FolderNode[];
  documents: DocumentEntity[];
}

@Component({
  selector: 'app-folder-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './folder-management.html',
  styleUrl: './folder-management.css'
})
export class FolderManagementComponent implements OnInit {
  currentFolder: FolderNode | null = null;
  navigationPath: FolderNode[] = []; 
  
  selectedDocumentId: number | null = null;
  showFolderModal = false;
  showDocModal = false;

  globalSearchQuery = '';

  isCategoryFilterEnabled = false;
  selectedFilterCategory = 'General';

  inputFolderName = '';
  inputFolderPermission = 'Public';

  editingFolderName = '';
  editingFolderPermission = 'Public';

  inputDocTitle = '';
  inputDocDescription = '';
  inputDocCategory = 'General';
  inputDocAccessibility = 'Authorized';
  
  selectedFile: File | null = null;
  uploadedFilePathDisplay = '';

  constructor(private router: Router, public state: StateService) {}

  ngOnInit(): void {
    // 💾 SHARED GLOBAL INSTANCE PRESERVATION:
    // Check if the folders tree already exists on the persistent StateService before initializing a clean root node.
    if (!(this.state as any).foldersTree || (this.state as any).foldersTree.length === 0) {
      (this.state as any).foldersTree = [
        {
          folder_id: 1,
          folder_name: 'Root Archive Matrix',
          created_by: 1,
          created_at: '2026-05-20',
          permission: 'Public',
          parent_id: null,
          subfolders: [],
          documents: []
        }
      ];
    }
    
    if (!(this.state as any).foldersTable) (this.state as any).foldersTable = [];
    if (!(this.state as any).documentsTable) (this.state as any).documentsTable = [];

    // Ensure all log tracking vectors exist permanently on the state model instance
    ['auditTable', 'logsTable', 'auditLogs'].forEach(tableName => {
      if (!(this.state as any)[tableName]) {
        (this.state as any)[tableName] = [];
      }
    });

    // Determine current position safely from state context or fall back to the global tree root element
    const tree = (this.state as any).foldersTree;
    if (tree && tree.length > 0) {
      // Retain folder path alignment if a previous session pointer exists
      const savedFolderId = (this.state as any).lastActiveFolderId;
      const foundFolder = savedFolderId ? this.findNodeInTree(tree, savedFolderId) : null;
      
      this.navigateToFolder(foundFolder || tree[0]);
    }
  }

  get rootFolders(): FolderNode[] {
    return (this.state as any).foldersTree || [];
  }

  // 📂 Traverses deep inside recursive branch configurations
  findNodeInTree(nodes: FolderNode[], targetId: number | null): FolderNode | null {
    if (targetId === null) return null;
    for (const node of nodes) {
      if (node.folder_id === targetId) return node;
      if (node.subfolders && node.subfolders.length > 0) {
        const found = this.findNodeInTree(node.subfolders, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  navigateToFolder(folder: FolderNode) {
    this.currentFolder = folder;
    this.editingFolderName = folder.folder_name;
    this.editingFolderPermission = folder.permission;
    
    // Save active folder index parameter inside StateService so navigation recalls where you were
    (this.state as any).lastActiveFolderId = folder.folder_id;

    this.navigationPath = [];
    let current: FolderNode | null = folder;
    while (current) {
      this.navigationPath.unshift(current);
      current = this.findNodeInTree(this.rootFolders, current.parent_id);
    }
    this.autoSelectFirstDocument();
  }

  navigateBackTo(index: number) {
    const targetFolder = this.navigationPath[index];
    if (targetFolder) {
      this.navigateToFolder(targetFolder);
    }
  }

  get visibleSubfolders(): FolderNode[] {
    if (!this.currentFolder) return [];
    const sub = this.currentFolder.subfolders || [];
    if (!this.globalSearchQuery.trim()) return sub;

    const query = this.globalSearchQuery.toLowerCase();
    return sub.filter(f => f.folder_name.toLowerCase().includes(query));
  }

  get filteredDocuments(): DocumentEntity[] {
    if (!this.currentFolder) return [];
    let result = [...(this.currentFolder.documents || [])];

    if (this.isCategoryFilterEnabled) {
      result = result.filter(doc => doc.category === this.selectedFilterCategory);
    }

    if (this.globalSearchQuery.trim()) {
      const query = this.globalSearchQuery.toLowerCase();
      result = result.filter(doc => doc.title.toLowerCase().includes(query) || doc.description.toLowerCase().includes(query));
    }

    return result;
  }

  get currentSelectedDocument(): DocumentEntity | undefined {
    return this.filteredDocuments.find(d => d.document_id === this.selectedDocumentId);
  }

  autoSelectFirstDocument(): void {
    const docs = this.filteredDocuments;
    if (docs.length > 0) {
      this.selectedDocumentId = docs[0].document_id;
    } else {
      this.selectedDocumentId = null;
    }
  }

  selectDocument(docId: number): void {
    this.selectedDocumentId = docId;
  }

  findMaxFolderId(nodes: FolderNode[]): number {
    let maxId = 0;
    for (const node of nodes) {
      if (node.folder_id > maxId) maxId = node.folder_id;
      if (node.subfolders && node.subfolders.length > 0) {
        const subMax = this.findMaxFolderId(node.subfolders);
        if (subMax > maxId) maxId = subMax;
      }
    }
    return maxId;
  }

  findMaxDocumentId(nodes: FolderNode[]): number {
    let maxId = 0;
    for (const node of nodes) {
      if (node.documents) {
        node.documents.forEach(d => {
          if (d.document_id > maxId) maxId = d.document_id;
        });
      }
      if (node.subfolders && node.subfolders.length > 0) {
        const subMax = this.findMaxDocumentId(node.subfolders);
        if (subMax > maxId) maxId = subMax;
      }
    }
    return maxId;
  }

  saveFolderModifications() {
    if (!this.currentFolder) return;
    if (this.currentFolder.folder_id === 1) {
      alert('The root archive system matrix cannot be edited.');
      return;
    }
    if (!this.editingFolderName.trim()) {
      alert('Folder name cannot be empty.');
      return;
    }

    const oldName = this.currentFolder.folder_name;
    const oldPermission = this.currentFolder.permission;
    
    if (oldName !== this.editingFolderName.trim() || oldPermission !== this.editingFolderPermission) {
      this.currentFolder.folder_name = this.editingFolderName.trim();
      this.currentFolder.permission = this.editingFolderPermission;
      
      const updateMessage = `Updated workspace directory details: "${oldName}" renamed to "${this.currentFolder.folder_name}" (Folder ID: #${this.currentFolder.folder_id})`;
      this.generateUnifiedLogEntry(updateMessage);
      this.state.persistDataChanges();
      alert('Directory configurations modified successfully.');
    }
  }

  openFolderModal() {
    this.inputFolderName = '';
    this.inputFolderPermission = 'Public';
    this.showFolderModal = true;
  }

  submitNewFolder() {
    if (!this.inputFolderName.trim()) {
      alert('Folder name is required.');
      return;
    }
    if (!this.currentFolder) {
      alert('Please navigate into a directory first.');
      return;
    }

    const nextId = this.findMaxFolderId(this.rootFolders) + 1;
    const newChild: FolderNode = {
      folder_id: nextId,
      folder_name: this.inputFolderName.trim(),
      created_by: this.state.currentUserUID || 1,
      created_at: new Date().toLocaleDateString(),
      permission: this.inputFolderPermission,
      parent_id: this.currentFolder.folder_id,
      subfolders: [],
      documents: []
    };

    if (!this.currentFolder.subfolders) {
      this.currentFolder.subfolders = [];
    }
    this.currentFolder.subfolders.push(newChild);

    if (this.state.foldersTable) {
      this.state.foldersTable.push({
        id: nextId,
        name: newChild.folder_name,
        title: newChild.folder_name,
        status: 'Permitted',
        type: 'Folder',
        category: 'Specifications',
        size: 'Shared Portfolio Directory',
        created_at: newChild.created_at,
        parentId: this.currentFolder.folder_id
      });
    }

    const logMsg = `Created subfolder branch: "${newChild.folder_name}" inside parent folder "${this.currentFolder.folder_name}" (Parent ID: #${this.currentFolder.folder_id}, New Folder ID: #${nextId})`;
    this.generateUnifiedLogEntry(logMsg);

    this.state.persistDataChanges();
    this.showFolderModal = false;
  }

  removeFolder(folderToDelete: FolderNode, event: Event) {
    event.stopPropagation();
    if (confirm(`Purge subfolder directory "${folderToDelete.folder_name}" along with all internal files and folders nested below it?`)) {
      if (!this.currentFolder) return;

      this.currentFolder.subfolders = this.currentFolder.subfolders.filter(f => f.folder_id !== folderToDelete.folder_id);
      
      if (this.state.foldersTable) {
        this.state.foldersTable = this.state.foldersTable.filter(f => f.id !== folderToDelete.folder_id);
      }

      const deleteMessage = `Purged nested folder tree entity: "${folderToDelete.folder_name}" (Folder ID: #${folderToDelete.folder_id})`;
      this.generateUnifiedLogEntry(deleteMessage);

      this.state.persistDataChanges();
      this.autoSelectFirstDocument();
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      if (!this.inputDocTitle.trim()) {
        this.inputDocTitle = file.name.split('.').slice(0, -1).join('.');
      }
      this.uploadedFilePathDisplay = `C:/Users/Laptop/Documents/Uploads/${file.name}`;
    }
  }

  openDocModal() {
    if (!this.currentFolder || this.currentFolder.folder_id === 1) {
      alert('Access Blocked: You cannot upload documents directly into the base Root matrix. Please create or navigate inside an actual folder branch first.');
      return;
    }
    this.inputDocTitle = '';
    this.inputDocDescription = '';
    this.inputDocCategory = 'General';
    this.inputDocAccessibility = 'Authorized';
    this.selectedFile = null;
    this.uploadedFilePathDisplay = '';
    this.showDocModal = true;
  }

  submitNewDocument() {
    if (!this.selectedFile || !this.currentFolder) {
      alert('Please choose a file from your laptop.');
      return;
    }
    if (this.currentFolder.folder_id === 1) {
      alert('Action Denied: Document must be bound inside a real directory folder.');
      return;
    }
    if (!this.inputDocTitle.trim()) {
      alert('Document display title field is mandatory.');
      return;
    }

    const nextDocId = this.findMaxDocumentId(this.rootFolders) + 1;

    const newDoc: DocumentEntity = {
      document_id: nextDocId,
      title: this.inputDocTitle.trim(),
      description: this.inputDocDescription.trim() || `Uploaded size: ${(this.selectedFile.size / 1024).toFixed(1)} KB`,
      category: this.inputDocCategory,
      file_path: this.uploadedFilePathDisplay,
      accessibility: this.inputDocAccessibility,
      folder_id: this.currentFolder.folder_id,
      uploaded_by: this.state.currentUserUID || 1,
      created_at: this.getNowTimeStamp()
    };

    if (!this.currentFolder.documents) this.currentFolder.documents = [];
    this.currentFolder.documents.push(newDoc);

    if (this.state.foldersTable) {
      const fileExt = this.selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE';
      const calcSize = (this.selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB';
      
      this.state.foldersTable.push({
        id: nextDocId + 10000,
        name: newDoc.title + '.' + fileExt.toLowerCase(),
        title: newDoc.title,
        status: 'Permitted',
        type: fileExt,
        category: this.inputDocCategory,
        size: calcSize === '0.0 MB' ? 'Sub-KB tracking payload' : calcSize,
        created_at: new Date().toLocaleDateString(),
        folderId: this.currentFolder.folder_id
      });
    }
    
    const docMessage = `Uploaded asset node: "${this.inputDocTitle.trim()}" into workspace branch folder "${this.currentFolder.folder_name}" (Folder ID: #${this.currentFolder.folder_id}, Sequenced Doc ID: #${nextDocId})`;
    this.generateUnifiedLogEntry(docMessage);

    this.state.persistDataChanges();
    this.selectedDocumentId = nextDocId; 
    this.showDocModal = false;
  }

  removeDocument(doc: DocumentEntity, event: Event) {
    event.stopPropagation();
    if (confirm(`Purge document node entry "${doc.title}" from this directory segment?`)) {
      if (!this.currentFolder) return;

      this.currentFolder.documents = (this.currentFolder.documents || []).filter(d => d.document_id !== doc.document_id);
      
      if (this.state.foldersTable) {
        this.state.foldersTable = this.state.foldersTable.filter(f => f.title !== doc.title);
      }

      const removeDocMessage = `Removed file node item: "${doc.title}" (Doc ID: #${doc.document_id})`;
      this.generateUnifiedLogEntry(removeDocMessage);

      this.state.persistDataChanges();
      if (this.selectedDocumentId === doc.document_id) {
        this.autoSelectFirstDocument();
      }
    }
  }

  get folderHistoryLogs() {
    if (!this.currentFolder) return [];
    const globalLogs = (this.state as any).auditTable || (this.state as any).logsTable || (this.state as any).auditLogs || [];
    const fidStr = String(this.currentFolder.folder_id);
    const fnameLower = this.currentFolder.folder_name.toLowerCase();

    return globalLogs.filter((log: any) => {
      if (!log) return false;
      const text = this.getLogMessageText(log).toLowerCase();
      return text.includes(`folder id: #${fidStr}`) || text.includes(`id: #${fidStr}`) || text.includes(fnameLower);
    });
  }

  clearCurrentFolderHistory() {
    if (!this.currentFolder) return;
    if (confirm(`Clear logs for directory context "${this.currentFolder.folder_name}"?`)) {
      const targetTables = ['auditTable', 'logsTable', 'auditLogs'];
      const fidStr = String(this.currentFolder.folder_id);
      const fnameLower = this.currentFolder.folder_name.toLowerCase();

      targetTables.forEach(tableName => {
        let arr = (this.state as any)[tableName];
        if (Array.isArray(arr)) {
          (this.state as any)[tableName] = arr.filter((log: any) => {
            if (!log) return false;
            const text = this.getLogMessageText(log).toLowerCase();
            return !(text.includes(`folder id: #${fidStr}`) || text.includes(`id: #${fidStr}`) || text.includes(fnameLower));
          });
        }
      });
      this.state.persistDataChanges();
    }
  }

  getLogMessageText(log: any): string {
    if (!log) return '';
    return log.action_executed_description || log.action_description || log.description || log.message || 'System Log Activity';
  }

  getNowTimeStamp(): string {
    return new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  generateUnifiedLogEntry(message: string) {
    const activeUID = this.state.currentUserUID || 1;
    const ts = this.getNowTimeStamp();
    
    if (typeof this.state.writeLogEntry === 'function') {
      this.state.writeLogEntry(activeUID, message);
    }

    ['auditTable', 'logsTable', 'auditLogs'].forEach(tableName => {
      if (!(this.state as any)[tableName]) {
        (this.state as any)[tableName] = [];
      }
      
      const arr = (this.state as any)[tableName];
      if (Array.isArray(arr)) {
        arr.push({
          id: arr.length + 1,
          user_uid: activeUID,
          action_executed_description: message,
          timestamp: ts
        });
      }
    });
  }

  navToDashboard() { this.router.navigate(['/admin/dashboard']); }
  navToDocManagement() { this.router.navigate(['/admin/folder-management']); }
  navToUserManagement() { this.router.navigate(['/admin/user-management']); }
  executeSignOut() { if (confirm('Sign out?')) this.router.navigate(['/login']); }
}