import express from 'express';
import {
    getAllFolders,
    getFolderById,
    createFolder,
    updateFolder,
    deleteFolder,
    getFoldersByUser
} from '../controllers/folder.controller.js';
import authMiddleware from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';

const router = express.Router();

// All folder routes require authentication
router.use(authMiddleware);

// Read-only routes - accessible by both admin and employees
router.get('/', getAllFolders);
router.get('/:id', getFolderById);
router.get('/user/:userId', getFoldersByUser);

// Write routes - Admin only (CREATE, UPDATE, DELETE)
router.post('/', isAdmin, createFolder);      // CHANGE: admin only
router.put('/:id', isAdmin, updateFolder);    // CHANGE: admin only
router.delete('/:id', isAdmin, deleteFolder); // Already admin only

export default router;