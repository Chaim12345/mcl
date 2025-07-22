import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getActivities,
  getItemActivities,
  getUserActivities,
  getActivityStats,
  formatActivityMessage,
  ActivityFilters,
} from '../services/activityService.js';
import Joi from 'joi';

const router = Router();

// Validation schemas
const getActivitiesSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('createdAt').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  itemId: Joi.string().optional(),
  userId: Joi.string().optional(),
  entityType: Joi.string().optional(),
  action: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

const getItemActivitiesSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('createdAt').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

// Get activities with filtering and pagination
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error, value } = getActivitiesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const {
      page,
      limit,
      sortBy,
      sortOrder,
      itemId,
      userId,
      entityType,
      action,
      startDate,
      endDate,
    } = value;

    const filters = {} as any;
    
    if (itemId) filters.itemId = itemId;
    if (userId) filters.userId = userId;
    if (entityType) filters.entityType = entityType;
    if (action) filters.action = action;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const pagination = {
      page,
      limit,
      sortBy,
      sortOrder,
    };

    const result = await getActivities(filters, pagination);

    // Add formatted messages to activities
    const activitiesWithMessages = result.activities.map(activity => ({
      ...activity,
      formattedMessage: formatActivityMessage(activity),
    }));

    return res.json({
      ...result,
      activities: activitiesWithMessages,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get activities for a specific item
router.get('/item/:itemId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ error: 'Missing itemId parameter' });
    }

    const { error, value } = getItemActivitiesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const pagination = {
      page: value.page,
      limit: value.limit,
      sortBy: value.sortBy,
      sortOrder: value.sortOrder,
    };

    const result = await getItemActivities(itemId, pagination);

    // Add formatted messages to activities
    const activitiesWithMessages = result.activities.map(activity => ({
      ...activity,
      formattedMessage: formatActivityMessage(activity),
    }));

    return res.json({
      ...result,
      activities: activitiesWithMessages,
    });
  } catch (error) {
    console.error('Error fetching item activities:', error);
    return res.status(500).json({ error: 'Failed to fetch item activities' });
  }
});

// Get activities for a specific user
router.get('/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const { error, value } = getItemActivitiesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const pagination = {
      page: value.page,
      limit: value.limit,
      sortBy: value.sortBy,
      sortOrder: value.sortOrder,
    };

    const result = await getUserActivities(userId, pagination);

    // Add formatted messages to activities
    const activitiesWithMessages = result.activities.map(activity => ({
      ...activity,
      formattedMessage: formatActivityMessage(activity),
    }));

    return res.json({
      ...result,
      activities: activitiesWithMessages,
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    return res.status(500).json({ error: 'Failed to fetch user activities' });
  }
});

// Get activity statistics
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { itemId, startDate, endDate } = req.query;

    const filters = {} as any;
    
    if (itemId) filters.itemId = itemId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const stats = await getActivityStats(filters);

    return res.json(stats);
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    return res.status(500).json({ error: 'Failed to fetch activity statistics' });
  }
});

export default router;