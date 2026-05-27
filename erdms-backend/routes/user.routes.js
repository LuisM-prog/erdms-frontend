import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    toggleUserStatus,
    resetUserPassword,
    getMyProfile,
    updateMyProfile,
    changeMyPassword
} from '../controllers/user.controller.js';
import authMiddleware from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';

const router = express.Router();

// Admin only routes
router.get('/', authMiddleware, isAdmin, getAllUsers);
router.get('/:id', authMiddleware, isAdmin, getUserById);
router.post('/', authMiddleware, isAdmin, createUser);
router.put('/:id', authMiddleware, isAdmin, updateUser);
router.patch('/:id/status', authMiddleware, isAdmin, toggleUserStatus);
router.post('/:id/reset-password', authMiddleware, isAdmin, resetUserPassword);

// Authenticated user routes (own profile)
router.get('/profile/me', authMiddleware, getMyProfile);
router.put('/profile/me', authMiddleware, updateMyProfile);
router.put('/profile/change-password', authMiddleware, changeMyPassword);

export default router;