import prisma from '../db/prisma.js';

export interface CreateActivityData {
  action: string;
  entityId: string;
  entityType: string;
  itemId?: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface ActivityWithUser {
  id: string;
  action: string;
  entityId: string;
  entityType: string;
  itemId: string | null;
  userId: string;
  metadata: any;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
  item?: {
    id: string;
    title: string;
  } | null;
}

export interface ActivityFilters {
  itemId?: string;
  userId?: string;
  entityType?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedActivities {
  activities: ActivityWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Activity type categories for better organization
export const ACTIVITY_CATEGORIES = {
  ITEM: 'item',
  COMMENT: 'comment',
  BOARD: 'board',
  WORKSPACE: 'workspace',
  USER: 'user',
} as const;

// Common activity actions
export const ACTIVITY_ACTIONS = {
  // Item actions
  ITEM_CREATED: 'item_created',
  ITEM_UPDATED: 'item_updated',
  ITEM_DELETED: 'item_deleted',
  ITEM_MOVED: 'item_moved',
  ITEM_STATUS_CHANGED: 'item_status_changed',
  ITEM_ASSIGNED: 'item_assigned',
  ITEM_UNASSIGNED: 'item_unassigned',
  ITEM_DUE_DATE_SET: 'item_due_date_set',
  ITEM_DUE_DATE_REMOVED: 'item_due_date_removed',
  ITEM_PRIORITY_CHANGED: 'item_priority_changed',
  
  // Comment actions
  COMMENT_CREATED: 'comment_created',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',
  
  // Board actions
  BOARD_CREATED: 'board_created',
  BOARD_UPDATED: 'board_updated',
  BOARD_DELETED: 'board_deleted',
  
  // Column actions
  COLUMN_CREATED: 'column_created',
  COLUMN_UPDATED: 'column_updated',
  COLUMN_DELETED: 'column_deleted',
  
  // Workspace actions
  WORKSPACE_CREATED: 'workspace_created',
  WORKSPACE_UPDATED: 'workspace_updated',
  WORKSPACE_MEMBER_ADDED: 'workspace_member_added',
  WORKSPACE_MEMBER_REMOVED: 'workspace_member_removed',
  WORKSPACE_MEMBER_ROLE_CHANGED: 'workspace_member_role_changed',
} as const;

/**
 * Create a new activity log entry
 */
export async function createActivity(data: CreateActivityData): Promise<ActivityWithUser> {
  const createData: any = {
    action: data.action,
    entityId: data.entityId,
    entityType: data.entityType,
    itemId: data.itemId || null,
    userId: data.userId,
  };
  
  if (data.metadata) {
    createData.metadata = data.metadata;
  }

  const activity = await prisma.activityLog.create({
    data: createData,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      item: data.itemId ? {
        select: {
          id: true,
          title: true,
        },
      } : false,
    },
  });

  return activity as ActivityWithUser;
}

/**
 * Get activities with filtering and pagination
 */
export async function getActivities(
  filters: any = {},
  pagination: PaginationOptions = {}
): Promise<PaginatedActivities> {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = pagination;

  const offset = (page - 1) * limit;

  // Build where clause
  const where: any = {};
  
  if (filters.itemId) {
    where.itemId = filters.itemId;
  }
  
  if (filters.userId) {
    where.userId = filters.userId;
  }
  
  if (filters.entityType) {
    where.entityType = filters.entityType;
  }
  
  if (filters.action) {
    where.action = filters.action;
  }
  
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  // Get total count for pagination
  const total = await prisma.activityLog.count({ where });

  // Get activities
  const activities = await prisma.activityLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      item: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip: offset,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Get activities for a specific item
 */
export async function getItemActivities(
  itemId: string,
  pagination: PaginationOptions = {}
): Promise<PaginatedActivities> {
  return getActivities({ itemId }, pagination);
}

/**
 * Get activities for a specific user
 */
export async function getUserActivities(
  userId: string,
  pagination: PaginationOptions = {}
): Promise<PaginatedActivities> {
  return getActivities({ userId }, pagination);
}

/**
 * Format activity message for display
 */
export function formatActivityMessage(activity: ActivityWithUser): string {
  const userName = activity.user.firstName && activity.user.lastName
    ? `${activity.user.firstName} ${activity.user.lastName}`
    : activity.user.email;

  const itemTitle = activity.item?.title || 'Unknown Item';

  switch (activity.action) {
    case ACTIVITY_ACTIONS.ITEM_CREATED:
      return `${userName} created item "${itemTitle}"`;
    
    case ACTIVITY_ACTIONS.ITEM_UPDATED:
      return `${userName} updated item "${itemTitle}"`;
    
    case ACTIVITY_ACTIONS.ITEM_DELETED:
      return `${userName} deleted item "${itemTitle}"`;
    
    case ACTIVITY_ACTIONS.ITEM_MOVED:
      const fromColumn = activity.metadata?.fromColumn || 'Unknown';
      const toColumn = activity.metadata?.toColumn || 'Unknown';
      return `${userName} moved "${itemTitle}" from ${fromColumn} to ${toColumn}`;
    
    case ACTIVITY_ACTIONS.ITEM_STATUS_CHANGED:
      const fromStatus = activity.metadata?.fromStatus || 'Unknown';
      const toStatus = activity.metadata?.toStatus || 'Unknown';
      return `${userName} changed status of "${itemTitle}" from ${fromStatus} to ${toStatus}`;
    
    case ACTIVITY_ACTIONS.ITEM_ASSIGNED:
      const assignedTo = activity.metadata?.assignedTo || 'Unknown';
      return `${userName} assigned "${itemTitle}" to ${assignedTo}`;
    
    case ACTIVITY_ACTIONS.ITEM_UNASSIGNED:
      return `${userName} unassigned "${itemTitle}"`;
    
    case ACTIVITY_ACTIONS.ITEM_DUE_DATE_SET:
      const dueDate = activity.metadata?.dueDate || 'Unknown';
      return `${userName} set due date of "${itemTitle}" to ${dueDate}`;
    
    case ACTIVITY_ACTIONS.ITEM_DUE_DATE_REMOVED:
      return `${userName} removed due date from "${itemTitle}"`;
    
    case ACTIVITY_ACTIONS.ITEM_PRIORITY_CHANGED:
      const fromPriority = activity.metadata?.fromPriority || 'Unknown';
      const toPriority = activity.metadata?.toPriority || 'Unknown';
      return `${userName} changed priority of "${itemTitle}" from ${fromPriority} to ${toPriority}`;
    
    case ACTIVITY_ACTIONS.COMMENT_CREATED:
      return `${userName} added a comment to "${itemTitle}"`;
    
    case ACTIVITY_ACTIONS.COMMENT_UPDATED:
      return `${userName} edited a comment on "${itemTitle}"`;
    
    case ACTIVITY_ACTIONS.COMMENT_DELETED:
      return `${userName} deleted a comment from "${itemTitle}"`;
    
    case ACTIVITY_ACTIONS.BOARD_CREATED:
      const boardName = activity.metadata?.boardName || 'Unknown Board';
      return `${userName} created board "${boardName}"`;
    
    case ACTIVITY_ACTIONS.BOARD_UPDATED:
      const updatedBoardName = activity.metadata?.boardName || 'Unknown Board';
      return `${userName} updated board "${updatedBoardName}"`;
    
    case ACTIVITY_ACTIONS.BOARD_DELETED:
      const deletedBoardName = activity.metadata?.boardName || 'Unknown Board';
      return `${userName} deleted board "${deletedBoardName}"`;
    
    default:
      return `${userName} performed action: ${activity.action}`;
  }
}

/**
 * Get activity category from action
 */
export function getActivityCategory(action: string): string {
  if (action.startsWith('item_')) {
    return ACTIVITY_CATEGORIES.ITEM;
  }
  if (action.startsWith('comment_')) {
    return ACTIVITY_CATEGORIES.COMMENT;
  }
  if (action.startsWith('board_') || action.startsWith('column_')) {
    return ACTIVITY_CATEGORIES.BOARD;
  }
  if (action.startsWith('workspace_')) {
    return ACTIVITY_CATEGORIES.WORKSPACE;
  }
  return 'other';
}

/**
 * Delete activities older than specified days
 */
export async function cleanupOldActivities(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.activityLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Get activity statistics
 */
export async function getActivityStats(
  filters: any = {}
): Promise<{
  totalActivities: number;
  activitiesByType: Record<string, number>;
  activitiesByUser: Array<{ userId: string; userName: string; count: number }>;
  recentActivityCount: number;
}> {
  const where: any = {};
  
  if (filters.itemId) {
    where.itemId = filters.itemId;
  }
  
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  // Get total count
  const totalActivities = await prisma.activityLog.count({ where });

  // Get activities by type
  const activitiesByTypeRaw = await prisma.activityLog.groupBy({
    by: ['action'],
    where,
    _count: {
      action: true,
    },
  });

  const activitiesByType: Record<string, number> = {};
  activitiesByTypeRaw.forEach(item => {
    const category = getActivityCategory(item.action);
    activitiesByType[category] = (activitiesByType[category] || 0) + item._count.action;
  });

  // Get activities by user
  const activitiesByUserRaw = await prisma.activityLog.groupBy({
    by: ['userId'],
    where,
    _count: {
      userId: true,
    },
    orderBy: {
      _count: {
        userId: 'desc',
      },
    },
    take: 10,
  });

  const userIds = activitiesByUserRaw.map(item => item.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  const activitiesByUser = activitiesByUserRaw.map(item => {
    const user = users.find(u => u.id === item.userId);
    const userName = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email || 'Unknown User';
    
    return {
      userId: item.userId,
      userName,
      count: item._count.userId,
    };
  });

  // Get recent activity count (last 24 hours)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const recentActivityCount = await prisma.activityLog.count({
    where: {
      ...where,
      createdAt: {
        gte: yesterday,
      },
    },
  });

  return {
    totalActivities,
    activitiesByType,
    activitiesByUser,
    recentActivityCount,
  };
}