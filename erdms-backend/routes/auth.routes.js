import express from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected route - needs token
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout); 

export default router;