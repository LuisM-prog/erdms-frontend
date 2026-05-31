import express from 'express';
import {
    requestAccess,
    getPendingAccessRequests,
    approveAccessRequest,
    rejectAccessRequest,
    checkItemAccess
} from '../controllers/access-request.controller.js';
import authMiddleware from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Employee can request access
router.post('/request', requestAccess);

// Check access (any authenticated user)
router.post('/check', checkItemAccess);

// Super Admin only routes
router.get('/pending', (req, res, next) => {
    if (req.user.user_id !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can view pending requests' });
    }
    next();
}, getPendingAccessRequests);

router.post('/:id/approve', (req, res, next) => {
    if (req.user.user_id !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can approve requests' });
    }
    next();
}, approveAccessRequest);

router.post('/:id/reject', (req, res, next) => {
    if (req.user.user_id !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can reject requests' });
    }
    next();
}, rejectAccessRequest);

export default router;