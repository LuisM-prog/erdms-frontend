import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import env from './config/db.config.js';
import testRoutes from './routes/test.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import folderRoutes from './routes/folder.routes.js'; 
import documentRoutes from './routes/document.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import logRoutes from './routes/log.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js'; 
import pendingActionsRoutes from './routes/pending-actions.routes.js';
import folderPermissionRoutes from './routes/folder-permission.routes.js';
import accessRequestRoutes from './routes/access-request.routes.js';
import { seedAdmin } from './utils/seedAdmin.js';


const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/permissions', permissionRoutes); 
app.use('/api/logs', logRoutes);
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/pending-actions', pendingActionsRoutes);
app.use('/api/folder-permissions', folderPermissionRoutes);
app.use('/api/access-requests', accessRequestRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

app.listen(env.PORT, () => {
    console.log(`[Server] Running on http://localhost:${env.PORT}`);
    seedAdmin();
});