import { notificationService, Notification } from './notificationService.js';

/**
 * Create item updated notification
 */
export async function createItemUpdatedNotification(data: {
  userId: string;
  updaterUserId: string;
  updaterUserName: string;
  itemId: string;
  itemName: string;
  boardId: string;
  workspaceId: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
}): Promise<Notification> {
  return notificationService.createNotification({
    userId: data.userId,
    type: 'item_updated',
    title: `"${data.itemName}" was updated`,
    message: `${data.updaterUserName} updated ${data.fieldName}`,
    data: {
      updaterUserId: data.updaterUserId,
      updaterUserName: data.updaterUserName,
      itemId: data.itemId,
      itemName: data.itemName,
      boardId: data.boardId,
      workspaceId: data.workspaceId,
      fieldName: data.fieldName,
      oldValue: data.oldValue,
      newValue: data.newValue,
    },
  });
}

/**
 * Create board shared notification
 */
export async function createBoardSharedNotification(data: {
  userId: string;
  sharerUserId: string;
  sharerUserName: string;
  boardId: string;
  boardName: string;
  workspaceId: string;
  workspaceName: string;
  role?: string;
}): Promise<Notification> {
  return notificationService.createNotification({
    userId: data.userId,
    type: 'board_shared',
    title: `${data.sharerUserName} shared a board with you`,
    message: `You now have access to "${data.boardName}" in ${data.workspaceName}`,
    data: {
      sharerUserId: data.sharerUserId,
      sharerUserName: data.sharerUserName,
      boardId: data.boardId,
      boardName: data.boardName,
      workspaceId: data.workspaceId,
      workspaceName: data.workspaceName,
      role: data.role,
    },
  });
}

/**
 * Create workspace invitation notification
 */
export async function createWorkspaceInvitationNotification(data: {
  userId: string;
  inviterUserId: string;
  inviterUserName: string;
  workspaceId: string;
  workspaceName: string;
  role: string;
  invitationId: string;
}): Promise<Notification> {
  return notificationService.createNotification({
    userId: data.userId,
    type: 'workspace_invitation',
    title: `${data.inviterUserName} invited you to join a workspace`,
    message: `You've been invited to join "${data.workspaceName}" as ${data.role}`,
    data: {
      inviterUserId: data.inviterUserId,
      inviterUserName: data.inviterUserName,
      workspaceId: data.workspaceId,
      workspaceName: data.workspaceName,
      role: data.role,
      invitationId: data.invitationId,
    },
  });
}

/**
 * Create due date reminder notification
 */
export async function createDueDateReminderNotification(data: {
  userId: string;
  itemId: string;
  itemName: string;
  boardId: string;
  boardName: string;
  workspaceId: string;
  dueDate: Date;
  daysUntilDue: number;
}): Promise<Notification> {
  let message = '';
  if (data.daysUntilDue === 0) {
    message = `"${data.itemName}" is due today`;
  } else if (data.daysUntilDue === 1) {
    message = `"${data.itemName}" is due tomorrow`;
  } else if (data.daysUntilDue > 1) {
    message = `"${data.itemName}" is due in ${data.daysUntilDue} days`;
  } else {
    message = `"${data.itemName}" is overdue by ${Math.abs(data.daysUntilDue)} days`;
  }

  return notificationService.createNotification({
    userId: data.userId,
    type: 'due_date_reminder',
    title: `Due date reminder`,
    message,
    data: {
      itemId: data.itemId,
      itemName: data.itemName,
      boardId: data.boardId,
      boardName: data.boardName,
      workspaceId: data.workspaceId,
      dueDate: data.dueDate,
      daysUntilDue: data.daysUntilDue,
    },
  });
}

/**
 * Create system notification
 */
export async function createSystemNotification(data: {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}): Promise<Notification> {
  return notificationService.createNotification({
    userId: data.userId,
    type: 'system',
    title: data.title,
    message: data.message,
    data: data.data || {},
  });
}