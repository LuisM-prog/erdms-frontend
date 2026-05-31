import express from 'express';
import {
    grantFolderAccess,
    revokeFolderAccess,
    getFolderAccessList
} from '../controllers/folder-permission.controller.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Grant folder access (Super Admin only)
router.post('/grant', (req, res, next) => {
    if (req.user.user_id !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can grant folder access' });
    }
    next();
}, grantFolderAccess);

// Revoke folder access (Super Admin only)
router.delete('/revoke/:folder_id/:user_id', (req, res, next) => {
    if (req.user.user_id !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can revoke folder access' });
    }
    next();
}, revokeFolderAccess);

// Get folder access list (Super Admin only)
router.get('/folder/:folder_id', (req, res, next) => {
    if (req.user.user_id !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can view folder access lists' });
    }
    next();
}, getFolderAccessList);

export default router;