import prisma from '../db/prisma.js';
import { NotificationType } from '@prisma/client';

export interface CreateCommentData {
  content: string;
  itemId: string;
  userId: string;
  parentId?: string;
  mentions?: string[];
}

export interface UpdateCommentData {
  content: string;
  mentions?: string[];
}

export interface CommentWithUser {
  id: string;
  content: string;
  itemId: string;
  userId: string;
  parentId: string | null;
  mentions: any;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
  replies?: CommentWithUser[];
}

/**
 * Extract user mentions from comment content
 * Looks for @username or @[User Name] patterns
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]|@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const mention = match[1] || match[2];
    if (mention && !mentions.includes(mention)) {
      mentions.push(mention);
    }
  }
  
  return mentions;
}

/**
 * Find user IDs from mention strings (usernames or display names)
 */
export async function resolveMentionedUsers(mentions: string[]): Promise<string[]> {
  if (mentions.length === 0) return [];
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: mentions } },
        { firstName: { in: mentions } },
        { lastName: { in: mentions } },
      ],
    },
    select: { id: true },
  });
  
  return users.map(user => user.id);
}

/**
 * Create notifications for mentioned users
 */
export async function createMentionNotifications(
  mentionedUserIds: string[],
  commentId: string,
  senderId: string,
  itemId: string
): Promise<void> {
  if (mentionedUserIds.length === 0) return;
  
  // Get item details for notification context
  const item = await prisma.boardItem.findUnique({
    where: { id: itemId },
    select: { title: true, board: { select: { name: true } } },
  });
  
  if (!item) return;
  
  const notifications = mentionedUserIds
    .filter(userId => userId !== senderId) // Don't notify the sender
    .map(userId => ({
      type: NotificationType.MENTION,
      title: 'You were mentioned in a comment',
      message: `You were mentioned in a comment on "${item.title}" in ${item.board.name}`,
      recipientId: userId,
      senderId,
      entityId: commentId,
      entityType: 'comment',
    }));
  
  if (notifications.length > 0) {
    await prisma.notification.createMany({
      data: notifications,
    });
  }
}

/**
 * Create a new comment with mention processing
 */
export async function createComment(data: CreateCommentData): Promise<CommentWithUser> {
  // Extract mentions from content
  const extractedMentions = extractMentions(data.content);
  const allMentions = [...new Set([...(data.mentions || []), ...extractedMentions])];
  
  // Resolve mentioned users
  const mentionedUserIds = await resolveMentionedUsers(allMentions);
  
  // Create the comment
  const comment = await prisma.comment.create({
    data: {
      content: data.content,
      itemId: data.itemId,
      userId: data.userId,
      parentId: data.parentId || null,
      mentions: mentionedUserIds,
    },
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
    },
  });
  
  // Create notifications for mentioned users
  await createMentionNotifications(mentionedUserIds, comment.id, data.userId, data.itemId);
  
  return comment;
}

/**
 * Get comments for an item with threading structure
 */
export async function getItemComments(itemId: string): Promise<CommentWithUser[]> {
  const comments = await prisma.comment.findMany({
    where: { itemId },
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
    },
    orderBy: { createdAt: 'asc' },
  });
  
  // Build threading structure
  const commentMap = new Map<string, CommentWithUser>();
  const rootComments: CommentWithUser[] = [];
  
  // First pass: create map and identify root comments
  comments.forEach(comment => {
    const commentWithReplies = { ...comment, replies: [] };
    commentMap.set(comment.id, commentWithReplies);
    
    if (!comment.parentId) {
      rootComments.push(commentWithReplies);
    }
  });
  
  // Second pass: build reply structure
  comments.forEach(comment => {
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      const child = commentMap.get(comment.id);
      if (parent && child) {
        parent.replies = parent.replies || [];
        parent.replies.push(child);
      }
    }
  });
  
  return rootComments;
}

/**
 * Update a comment with mention processing
 */
export async function updateComment(
  commentId: string,
  userId: string,
  data: UpdateCommentData
): Promise<CommentWithUser> {
  // Check if user owns the comment
  const existingComment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true, itemId: true },
  });
  
  if (!existingComment) {
    throw new Error('Comment not found');
  }
  
  if (existingComment.userId !== userId) {
    throw new Error('Permission denied: You can only edit your own comments');
  }
  
  // Extract mentions from content
  const extractedMentions = extractMentions(data.content);
  const allMentions = [...new Set([...(data.mentions || []), ...extractedMentions])];
  
  // Resolve mentioned users
  const mentionedUserIds = await resolveMentionedUsers(allMentions);
  
  // Update the comment
  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: {
      content: data.content,
      mentions: mentionedUserIds,
      isEdited: true,
      editedAt: new Date(),
    },
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
    },
  });
  
  // Create notifications for newly mentioned users
  await createMentionNotifications(mentionedUserIds, commentId, userId, existingComment.itemId);
  
  return updatedComment;
}

/**
 * Delete a comment (with permission check)
 */
export async function deleteComment(commentId: string, userId: string): Promise<void> {
  // Check if user owns the comment
  const existingComment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });
  
  if (!existingComment) {
    throw new Error('Comment not found');
  }
  
  if (existingComment.userId !== userId) {
    throw new Error('Permission denied: You can only delete your own comments');
  }
  
  // Delete the comment (cascade will handle replies)
  await prisma.comment.delete({
    where: { id: commentId },
  });
}

/**
 * Get comment by ID with user info
 */
export async function getCommentById(commentId: string): Promise<CommentWithUser | null> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
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
    },
  });
  
  return comment;
}