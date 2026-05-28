import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-folder-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './folder-management.html',
  styleUrls: ['./folder-management.css']
})
export class FolderManagementComponent implements OnInit {
  // Data
  folders: any[] = [];
  documents: any[] = [];
  selectedFolderId: number | null = null;
  selectedFolderName: string = '';
  selectedFolderPermission: string = 'public';
  
  // UI State
  showFolderModal = false;
  showDocModal = false;
  isLoading = false;
  errorMessage = '';
  
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
      
      // Auto-select first folder if none selected and folders exist
      if (this.folders.length > 0 && !this.selectedFolderId) {
        this.selectFolder(this.folders[0]);
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to load data';
      console.error('Load error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  selectFolder(folder: any) {
    this.selectedFolderId = folder.folder_id;
    this.selectedFolderName = folder.folder_name;
    this.selectedFolderPermission = folder.permissions;
  }

  get documentsInSelectedFolder() {
    return this.documents.filter(doc => doc.folder_id === this.selectedFolderId);
  }

  // Folder CRUD
  openCreateFolderModal() {
    this.inputFolderName = '';
    this.inputFolderPermission = 'public';
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
      alert('Failed to create folder. Please try again.');
    }
    this.isLoading = false;
  }

    async updateFolder() {
    if (!this.selectedFolderId) return;
    if (!this.selectedFolderName.trim()) {
      alert('Folder name cannot be empty');
      return;
    }
    
    // Get the original folder data first
    const originalFolder = this.folders.find(f => f.folder_id === this.selectedFolderId);
    if (!originalFolder) return;
    
    // Check if anything actually changed
    const nameChanged = this.selectedFolderName.trim() !== originalFolder.folder_name;
    const permissionChanged = this.selectedFolderPermission !== originalFolder.permissions;
    
    if (!nameChanged && !permissionChanged) {
      alert('No changes were made to the folder');
      return;
    }
    
    this.isLoading = true;
    const updateData: any = {};
    if (nameChanged) updateData.folder_name = this.selectedFolderName.trim();
    if (permissionChanged) updateData.permissions = this.selectedFolderPermission;
    
    const success = await this.state.updateFolder(this.selectedFolderId, updateData);
    
    if (success) {
      alert('Folder updated successfully!');
      await this.loadData();
    } else {
      alert('Failed to update folder');
    }
    this.isLoading = false;
  }

  async deleteFolder(folderId: number, folderName: string) {
    if (confirm(`Are you sure you want to delete "${folderName}" and ALL documents inside it? This cannot be undone.`)) {
      this.isLoading = true;
      const success = await this.state.deleteFolder(folderId);
      if (success) {
        alert(`Folder "${folderName}" deleted successfully.`);
        if (this.selectedFolderId === folderId) {
          this.selectedFolderId = null;
          this.selectedFolderName = '';
        }
        await this.loadData();
      } else {
        alert('Failed to delete folder');
      }
      this.isLoading = false;
    }
  }

  // Document CRUD
  openUploadModal() {
    if (!this.selectedFolderId) {
      alert('Please select a folder first');
      return;
    }
    this.inputDocTitle = '';
    this.inputDocDescription = '';
    this.inputDocCategory = 'General';
    this.inputDocAccessibility = 'public';
    this.selectedFile = null;
    this.showDocModal = true;
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile && !this.inputDocTitle) {
      // Auto-populate title from filename (without extension)
      this.inputDocTitle = this.selectedFile.name.replace(/\.[^/.]+$/, '');
    }
  }

  async uploadDocument() {
    if (!this.selectedFolderId) {
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
    formData.append('folder_id', this.selectedFolderId.toString());
    formData.append('accessibility', this.inputDocAccessibility);
    
    this.isLoading = true;
    const result = await this.state.uploadDocument(formData);
    
    if (result) {
      alert(`Document "${this.inputDocTitle}" uploaded successfully!`);
      await this.loadData();
      this.showDocModal = false;
    } else {
      alert('Failed to upload document. Please try again.');
    }
    this.isLoading = false;
  }

  async deleteDocument(documentId: number, documentTitle: string) {
    if (confirm(`Are you sure you want to delete "${documentTitle}"?`)) {
      this.isLoading = true;
      const success = await this.state.deleteDocument(documentId);
      if (success) {
        alert(`Document "${documentTitle}" deleted successfully.`);
        await this.loadData();
      } else {
        alert('Failed to delete document');
      }
      this.isLoading = false;
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