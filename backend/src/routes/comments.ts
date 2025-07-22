import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createComment,
  getItemComments,
  updateComment,
  deleteComment,
  getCommentById,
} from '../services/commentService.js';
import { logCommentActivity } from '../middleware/activityLogger.js';
import { ACTIVITY_ACTIONS } from '../services/activityService.js';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createCommentSchema = Joi.object({
  content: Joi.string().required().min(1).max(10000),
  itemId: Joi.string().required(),
  parentId: Joi.string().optional(),
  mentions: Joi.array().items(Joi.string()).optional(),
});

const updateCommentSchema = Joi.object({
  content: Joi.string().required().min(1).max(10000),
  mentions: Joi.array().items(Joi.string()).optional(),
});

// Create a comment (supports threading and mentions)
router.post('/', authenticateToken, logCommentActivity(ACTIVITY_ACTIONS.COMMENT_CREATED), async (req: Request, res: Response) => {
  try {
    const { error, value } = createCommentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const comment = await createComment({
      ...value,
      userId,
    });

    return res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Get all comments for an item (with threading structure)
router.get('/item/:itemId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Missing itemId parameter' });
    }

    const comments = await getItemComments(itemId);
    return res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get a specific comment by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing comment ID' });
    }

    const comment = await getCommentById(id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    return res.json(comment);
  } catch (error) {
    console.error('Error fetching comment:', error);
    return res.status(500).json({ error: 'Failed to fetch comment' });
  }
});

// Update a comment (with permission check and mention processing)
router.put('/:id', authenticateToken, logCommentActivity(ACTIVITY_ACTIONS.COMMENT_UPDATED), async (req: Request, res: Response) => {
  try {
    const { error, value } = updateCommentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const { id } = req.params;
    const userId = req.user?.id;

    if (!id) {
      return res.status(400).json({ error: 'Missing comment ID' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const updatedComment = await updateComment(id, userId, value);
    return res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Comment not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Permission denied')) {
        return res.status(403).json({ error: error.message });
      }
    }
    
    return res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment (with permission check)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id) {
      return res.status(400).json({ error: 'Missing comment ID' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await deleteComment(id, userId);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting comment:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Comment not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Permission denied')) {
        return res.status(403).json({ error: error.message });
      }
    }
    
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
