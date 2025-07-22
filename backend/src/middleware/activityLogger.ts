import { Request, Response, NextFunction } from 'express';
import { createActivity, ACTIVITY_ACTIONS } from '../services/activityService.js';

/**
 * Middleware to automatically log activities for item changes
 * This should be used after the main operation is completed
 */
export const logItemActivity = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store the original json method
    const originalJson = res.json;

    // Override the json method to capture the response
    res.json = function(body: any) {
      // Only log if the operation was successful (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Extract relevant data from request and response
        const userId = req.user?.id;
        const itemId = req.params.id || req.params.itemId || body?.id;
        
        if (userId && itemId) {
          // Log the activity asynchronously (don't block the response)
          setImmediate(async () => {
            try {
              await createActivity({
                action,
                entityId: itemId,
                entityType: 'item',
                itemId,
                userId,
                metadata: extractMetadata(req, body, action),
              });
            } catch (error) {
              console.error('Failed to log activity:', error);
            }
          });
        }
      }

      // Call the original json method
      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to log comment activities
 */
export const logCommentActivity = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id;
        const commentId = req.params.id || body?.id;
        const itemId = req.body?.itemId || body?.itemId;
        
        if (userId && commentId) {
          setImmediate(async () => {
            try {
              await createActivity({
                action,
                entityId: commentId,
                entityType: 'comment',
                itemId,
                userId,
                metadata: extractCommentMetadata(req, body, action),
              });
            } catch (error) {
              console.error('Failed to log comment activity:', error);
            }
          });
        }
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to log board activities
 */
export const logBoardActivity = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id;
        const boardId = req.params.id || body?.id;
        
        if (userId && boardId) {
          setImmediate(async () => {
            try {
              await createActivity({
                action,
                entityId: boardId,
                entityType: 'board',
                userId,
                metadata: extractBoardMetadata(req, body, action),
              });
            } catch (error) {
              console.error('Failed to log board activity:', error);
            }
          });
        }
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Extract metadata for item activities
 */
function extractMetadata(req: Request, body: any, action: string): Record<string, any> {
  const metadata: Record<string, any> = {};

  switch (action) {
    case ACTIVITY_ACTIONS.ITEM_CREATED:
      metadata.title = body?.title || req.body?.title;
      metadata.status = body?.status || req.body?.status;
      metadata.priority = body?.priority || req.body?.priority;
      break;

    case ACTIVITY_ACTIONS.ITEM_UPDATED:
      // Store what fields were updated
      const updatedFields = [];
      if (req.body?.title) {
        updatedFields.push('title');
        metadata.newTitle = req.body.title;
      }
      if (req.body?.description) {
        updatedFields.push('description');
      }
      if (req.body?.status) {
        updatedFields.push('status');
        metadata.newStatus = req.body.status;
      }
      if (req.body?.priority) {
        updatedFields.push('priority');
        metadata.newPriority = req.body.priority;
      }
      if (req.body?.dueDate) {
        updatedFields.push('dueDate');
        metadata.newDueDate = req.body.dueDate;
      }
      metadata.updatedFields = updatedFields;
      break;

    case ACTIVITY_ACTIONS.ITEM_MOVED:
      metadata.fromColumn = req.body?.fromColumn;
      metadata.toColumn = req.body?.toColumn;
      metadata.newOrder = req.body?.order;
      break;

    case ACTIVITY_ACTIONS.ITEM_STATUS_CHANGED:
      metadata.fromStatus = req.body?.fromStatus;
      metadata.toStatus = req.body?.status;
      break;

    case ACTIVITY_ACTIONS.ITEM_PRIORITY_CHANGED:
      metadata.fromPriority = req.body?.fromPriority;
      metadata.toPriority = req.body?.priority;
      break;

    case ACTIVITY_ACTIONS.ITEM_ASSIGNED:
      metadata.assignedTo = req.body?.assignedTo;
      break;

    case ACTIVITY_ACTIONS.ITEM_DUE_DATE_SET:
      metadata.dueDate = req.body?.dueDate;
      break;
  }

  return metadata;
}

/**
 * Extract metadata for comment activities
 */
function extractCommentMetadata(req: Request, body: any, action: string): Record<string, any> {
  const metadata: Record<string, any> = {};

  switch (action) {
    case ACTIVITY_ACTIONS.COMMENT_CREATED:
      metadata.hasParent = !!req.body?.parentId;
      metadata.mentionCount = req.body?.mentions?.length || 0;
      break;

    case ACTIVITY_ACTIONS.COMMENT_UPDATED:
      metadata.wasEdited = true;
      metadata.mentionCount = req.body?.mentions?.length || 0;
      break;
  }

  return metadata;
}

/**
 * Extract metadata for board activities
 */
function extractBoardMetadata(req: Request, body: any, action: string): Record<string, any> {
  const metadata: Record<string, any> = {};

  switch (action) {
    case ACTIVITY_ACTIONS.BOARD_CREATED:
    case ACTIVITY_ACTIONS.BOARD_UPDATED:
    case ACTIVITY_ACTIONS.BOARD_DELETED:
      metadata.boardName = body?.name || req.body?.name;
      metadata.workspaceId = body?.workspaceId || req.body?.workspaceId;
      break;
  }

  return metadata;
}

/**
 * Helper function to manually log an activity (for use in service functions)
 */
export async function logActivity(
  action: string,
  entityId: string,
  entityType: string,
  userId: string,
  itemId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await createActivity({
      action,
      entityId,
      entityType,
      userId,
      ...(itemId && { itemId }),
      ...(metadata && { metadata }),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}