import express from 'express';
import {
    requestStatusChange,
    getPendingActions,
    approveAction,
    rejectAction,
    getPendingActionHistory  
} from '../controllers/pending-actions.controller.js';
import authMiddleware from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(isAdmin);

// Request status change (requires 2FA for non-super admins)
router.post('/request', requestStatusChange);

// Super Admin only routes
router.get('/', getPendingActions);
router.get('/history', getPendingActionHistory);  
router.post('/:id/approve', approveAction);
router.post('/:id/reject', rejectAction);

export default router;