import express from 'express';
import {
    getDocumentAccessList,
    grantDocumentAccess,
    revokeDocumentAccess,
    getUserDocumentAccess,
    checkDocumentAccess,
    getAllUsersSimple
} from '../controllers/permission.controller.js';
import authMiddleware from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';

const router = express.Router();

// All permission routes require authentication
router.use(authMiddleware);

// Check access (any authenticated user)
router.post('/check', checkDocumentAccess);

// Admin only routes
router.get('/users', isAdmin, getAllUsersSimple);
router.get('/document/:documentId', isAdmin, getDocumentAccessList);
router.post('/document/:documentId', isAdmin, grantDocumentAccess);
router.delete('/document/:documentId/user/:userId', isAdmin, revokeDocumentAccess);
router.get('/user/:userId', isAdmin, getUserDocumentAccess);

export default router;