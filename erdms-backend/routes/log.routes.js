import express from 'express';
import {
    getAllLogs,
    getLogsByUser,
    getLogsByDocument,
    getLogsByAction,
    getLogStats,
    getRecentLogs
} from '../controllers/log.controller.js';
import authMiddleware from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';

const router = express.Router();

// All log routes require authentication and admin role
router.use(authMiddleware);
router.use(isAdmin);

router.get('/', getAllLogs);
router.get('/stats', getLogStats);
router.get('/recent', getRecentLogs);
router.get('/user/:userId', getLogsByUser);
router.get('/document/:documentId', getLogsByDocument);
router.get('/action/:action', getLogsByAction);

export default router;