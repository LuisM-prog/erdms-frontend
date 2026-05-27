import express from 'express';
import { healthCheck, dbCheck, listTables } from '../controllers/test.controller.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Public routes — no token needed
router.get('/', healthCheck);
router.get('/db', dbCheck);

// Protected route (middleware is bypassed for now - Lab 3&4)
router.get('/tables', authMiddleware, listTables);

export default router;