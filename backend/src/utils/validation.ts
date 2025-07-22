import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validate request against schema
 */
export const validate = (schema: Joi.Schema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[source]);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.details.map(x => x.message).join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }
    
    return next();
  };
};

export const validateRequest = validate;

/**
 * Auth validation schemas
 */
export const registerSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

/**
 * Notification validation schemas
 */
export const notificationSchemas = {
  getNotifications: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
    unreadOnly: Joi.boolean().default(false),
    type: Joi.string().valid(
      'mention', 
      'assignment', 
      'comment', 
      'item_updated', 
      'board_shared', 
      'workspace_invitation', 
      'due_date_reminder', 
      'system'
    ).optional(),
  }),

  markAsRead: Joi.object({
    notificationIds: Joi.array().items(Joi.string().required()).min(1).required(),
  }),

  updatePreferences: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional(),
    mentionNotifications: Joi.boolean().optional(),
    assignmentNotifications: Joi.boolean().optional(),
    commentNotifications: Joi.boolean().optional(),
    dueDateReminders: Joi.boolean().optional(),
    workspaceInvitations: Joi.boolean().optional(),
  }),
};