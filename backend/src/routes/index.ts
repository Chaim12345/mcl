import { Router } from 'express';
import authRoutes from './auth.js';
import workspaceRoutes from './workspaces.js';
import boardRoutes from './boards.js';
import commentRoutes from './comments.js';
import activityRoutes from './activities.js';
import notificationRoutes from './notifications.js';
import filterRoutes from './filters.js';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount workspace routes
router.use('/workspaces', workspaceRoutes);

// Mount board routes
router.use('/boards', boardRoutes);

// Mount comment routes
router.use('/comments', commentRoutes);

// Mount activity routes
router.use('/activities', activityRoutes);

// Mount notification routes
router.use('/notifications', notificationRoutes);

// Mount filter, search, and view routes
router.use('/', filterRoutes);

export default router;