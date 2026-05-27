import express from 'express';
import {
    getAllDocuments,
    getDocumentsByFolder,
    getDocumentById,
    uploadDocument,
    updateDocument,
    deleteDocument,
    searchDocuments,
    downloadDocument,
    getAccessibleDocuments
} from '../controllers/document.controller.js';
import authMiddleware from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// All document routes require authentication
router.use(authMiddleware);

// Read-only routes - accessible by both admin and employees
router.get('/', getAllDocuments);
router.get('/accessible', getAccessibleDocuments);
router.get('/folder/:folderId', getDocumentsByFolder);
router.get('/search', searchDocuments);
router.get('/:id', getDocumentById);
router.get('/:id/download', downloadDocument);

// Write routes - Admin only (CREATE, UPDATE, DELETE)
router.post('/upload', isAdmin, upload.single('file'), uploadDocument);  
router.put('/:id', isAdmin, updateDocument);                              
router.delete('/:id', isAdmin, deleteDocument);                           

export default router;