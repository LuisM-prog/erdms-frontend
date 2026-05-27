import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface DocumentAsset {
  title: string;
  folder: string;
  accessibility: string;
  size: string;
}

@Component({
  selector: 'app-document-management',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './document-management.html',
  styleUrl: './document-management.css'
})
export class DocumentManagementComponent {

  // Seed baseline file repository array
  docsList: DocumentAsset[] = [
    { title: 'Project_Architecture_Blueprint_v1.pdf', folder: '/Root/System_Core', accessibility: 'Confidential', size: '4.2 MB' },
    { title: 'Corporate_Tax_ledger_Q3.xlsx', folder: '/Root/Finance_Reports', accessibility: 'Confidential', size: '12.8 MB' },
    { title: 'NonDisclosure_Agreement_Blank.docx', folder: '/Root/Legal_Templates', accessibility: 'General Public', size: '142 KB' },
    { title: 'Employee_Onboarding_Handbook.pdf', folder: '/Root/Human_Resources', accessibility: 'Restricted', size: '2.1 MB' },
    { title: 'Open_Source_Licensing_Agreement.txt', folder: '/Root/Legal_Templates', accessibility: 'General Public', size: '45 KB' }
  ];

  // Model object linked directly to upload inputs
  newDoc: DocumentAsset = {
    title: '',
    folder: '/Root/System_Core',
    accessibility: 'Confidential',
    size: ''
  };

  // Simulates pushing a brand new document record tracking node
  uploadDocument(event: Event) {
    event.preventDefault();

    // Check for standard extension string formatting safety
    let fileName = this.newDoc.title.trim();
    if (!fileName.includes('.')) {
      fileName += '.pdf'; // Default to a standard document format
    }

    // Generate random mock file sizes to look professional
    const mockSizes = ['1.4 MB', '820 KB', '3.1 MB', '240 KB', '5.7 MB'];
    const randomSize = mockSizes[Math.floor(Math.random() * mockSizes.length)];

    const docToAdd: DocumentAsset = {
      title: fileName,
      folder: this.newDoc.folder,
      accessibility: this.newDoc.accessibility,
      size: randomSize
    };

    this.docsList.unshift(docToAdd); // Prepend to the grid top
    this.newDoc.title = ''; // Reset file input text
  }

  // Use Case Prompt implementation: Edit Target Metadata
  editMetadataPrompt(doc: DocumentAsset) {
    const amendedTitle = prompt(`Amend structural file metadata title:`, doc.title);
    if (amendedTitle && amendedTitle.trim() !== '') {
      doc.title = amendedTitle.trim();
    }
  }

  // Use Case Prompt implementation: Cycle through Document Visibility Contexts
  toggleAccessibility(doc: DocumentAsset) {
    if (doc.accessibility === 'Confidential') {
      doc.accessibility = 'Restricted';
    } else if (doc.accessibility === 'Restricted') {
      doc.accessibility = 'General Public';
    } else {
      doc.accessibility = 'Confidential';
    }
  }

  // Use Case Prompt implementation: Secure Purge/Delete Records File Node
  deleteDocument(targetDoc: DocumentAsset) {
    if (confirm(`Are you completely sure you want to delete and un-link "${targetDoc.title}" from storage?`)) {
      this.docsList = this.docsList.filter(d => d.title !== targetDoc.title);
    }
  }
}