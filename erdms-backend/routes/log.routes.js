import express from 'express';
import {
    getAllLogs,
    getLogsByUser,
    getLogsByDocument,
    getLogsByAction,
    getLogStats,
    getRecentLogs,
    createLog,
    getMyLogs           
} from '../controllers/log.controller.js';
import authMiddleware from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';

const router = express.Router();

// All log routes require authentication
router.use(authMiddleware);

// POST route - create log (admin only)
router.post('/', isAdmin, createLog);

// GET routes - admin only
router.get('/', isAdmin, getAllLogs);
router.get('/stats', isAdmin, getLogStats);
router.get('/recent', isAdmin, getRecentLogs);
router.get('/user/:userId', isAdmin, getLogsByUser);
router.get('/document/:documentId', isAdmin, getLogsByDocument);
router.get('/action/:action', isAdmin, getLogsByAction);

// Employee can get their own logs (no admin required)
router.get('/my-logs', getMyLogs);

export default router;