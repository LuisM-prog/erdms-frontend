import express from 'express';
import {
    requestStatusChange,
    getPendingActions,
    approveAction,
    rejectAction,
    getPendingActionHistory,
    requestPasswordReset,
    requestRoleChange      
} from '../controllers/pending-actions.controller.js';
import authMiddleware from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(isAdmin);

// Request routes
router.post('/request', requestStatusChange);
router.post('/password-reset-request', requestPasswordReset);
router.post('/role-change-request', requestRoleChange);  

// Super Admin only routes
router.get('/', getPendingActions);
router.get('/history', getPendingActionHistory);
router.post('/:id/approve', approveAction);
router.post('/:id/reject', rejectAction);

export default router;