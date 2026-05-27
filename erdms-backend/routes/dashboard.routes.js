import express from 'express';
import {
    getDashboardStats,
    getChartData,
    getRecentActivity,
    getTopUsers,
    getTopDocuments
} from '../controllers/dashboard.controller.js';
import authMiddleware from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';

const router = express.Router();

// All dashboard routes require admin access
router.use(authMiddleware);
router.use(isAdmin);

router.get('/stats', getDashboardStats);
router.get('/charts', getChartData);
router.get('/activity', getRecentActivity);
router.get('/top-users', getTopUsers);
router.get('/top-documents', getTopDocuments);

export default router;