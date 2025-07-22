import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import prisma from '../../db/prisma.js';
import {
  createComment,
  getItemComments,
  updateComment,
  deleteComment,
  getCommentById,
  extractMentions,
  resolveMentionedUsers,
} from '../commentService.js';

describe('CommentService', () => {
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;
  let testWorkspace: any;
  let testBoard: any;
  let testColumn: any;
  let testItem: any;

  beforeAll(async () => {
    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        email: 'commenter1@test.com',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'commenter2@test.com',
        password: 'hashedpassword',
        firstName: 'Jane',
        lastName: 'Smith',
      },
    });

    testUser3 = await prisma.user.create({
      data: {
        email: 'commenter3@test.com',
        password: 'hashedpassword',
        firstName: 'Bob',
        lastName: 'Wilson',
      },
    });

    // Create test workspace and board structure
    testWorkspace = await prisma.workspace.create({
      data: {
        name: 'Test Workspace',
        ownerId: testUser1.id,
      },
    });

    testBoard = await prisma.board.create({
      data: {
        name: 'Test Board',
        workspaceId: testWorkspace.id,
      },
    });

    testColumn = await prisma.boardColumn.create({
      data: {
        name: 'Test Column',
        boardId: testBoard.id,
        order: 0,
      },
    });

    testItem = await prisma.boardItem.create({
      data: {
        title: 'Test Item',
        boardId: testBoard.id,
        columnId: testColumn.id,
        order: 0,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.notification.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.boardItem.deleteMany();
    await prisma.boardColumn.deleteMany();
    await prisma.board.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up comments and notifications before each test
    await prisma.notification.deleteMany();
    await prisma.comment.deleteMany();
  });

  describe('extractMentions', () => {
    it('should extract mentions from comment content', () => {
      const content = 'Hey @John and @[Jane Smith], please review this task @Bob';
      const mentions = extractMentions(content);
      expect(mentions).toEqual(['John', 'Jane Smith', 'Bob']);
    });

    it('should handle duplicate mentions', () => {
      const content = 'Hey @John, @John please check this';
      const mentions = extractMentions(content);
      expect(mentions).toEqual(['John']);
    });

    it('should return empty array for no mentions', () => {
      const content = 'This is a regular comment without mentions';
      const mentions = extractMentions(content);
      expect(mentions).toEqual([]);
    });
  });

  describe('resolveMentionedUsers', () => {
    it('should resolve user IDs from mention strings', async () => {
      const mentions = ['John', 'Jane', 'commenter2@test.com'];
      const userIds = await resolveMentionedUsers(mentions);
      
      expect(userIds).toContain(testUser1.id); // John
      expect(userIds).toContain(testUser2.id); // Jane and email
      expect(userIds.length).toBeGreaterThan(0);
    });

    it('should return empty array for no valid mentions', async () => {
      const mentions = ['NonExistentUser'];
      const userIds = await resolveMentionedUsers(mentions);
      expect(userIds).toEqual([]);
    });
  });

  describe('createComment', () => {
    it('should create a basic comment', async () => {
      const commentData = {
        content: 'This is a test comment',
        itemId: testItem.id,
        userId: testUser1.id,
      };

      const comment = await createComment(commentData);

      expect(comment).toBeDefined();
      expect(comment.content).toBe(commentData.content);
      expect(comment.itemId).toBe(commentData.itemId);
      expect(comment.userId).toBe(commentData.userId);
      expect(comment.parentId).toBeNull();
      expect(comment.user).toBeDefined();
      expect(comment.user.firstName).toBe('John');
    });

    it('should create a threaded comment (reply)', async () => {
      // Create parent comment first
      const parentComment = await createComment({
        content: 'Parent comment',
        itemId: testItem.id,
        userId: testUser1.id,
      });

      // Create reply
      const replyData = {
        content: 'This is a reply',
        itemId: testItem.id,
        userId: testUser2.id,
        parentId: parentComment.id,
      };

      const reply = await createComment(replyData);

      expect(reply.parentId).toBe(parentComment.id);
      expect(reply.content).toBe(replyData.content);
      expect(reply.userId).toBe(testUser2.id);
    });

    it('should process mentions and create notifications', async () => {
      const commentData = {
        content: 'Hey @Jane, please check this task',
        itemId: testItem.id,
        userId: testUser1.id,
      };

      const comment = await createComment(commentData);

      expect(comment.mentions).toContain(testUser2.id);

      // Check that notification was created
      const notifications = await prisma.notification.findMany({
        where: {
          recipientId: testUser2.id,
          type: 'MENTION',
        },
      });

      expect(notifications.length).toBe(1);
      expect(notifications[0].senderId).toBe(testUser1.id);
      expect(notifications[0].entityId).toBe(comment.id);
    });

    it('should not create notification for self-mention', async () => {
      const commentData = {
        content: 'Hey @John, this is a self mention',
        itemId: testItem.id,
        userId: testUser1.id,
      };

      await createComment(commentData);

      // Check that no notification was created for self-mention
      const notifications = await prisma.notification.findMany({
        where: {
          recipientId: testUser1.id,
          type: 'MENTION',
        },
      });

      expect(notifications.length).toBe(0);
    });
  });

  describe('getItemComments', () => {
    it('should return comments with threading structure', async () => {
      // Create parent comment
      const parentComment = await createComment({
        content: 'Parent comment',
        itemId: testItem.id,
        userId: testUser1.id,
      });

      // Create replies
      const reply1 = await createComment({
        content: 'First reply',
        itemId: testItem.id,
        userId: testUser2.id,
        parentId: parentComment.id,
      });

      const reply2 = await createComment({
        content: 'Second reply',
        itemId: testItem.id,
        userId: testUser3.id,
        parentId: parentComment.id,
      });

      // Create another root comment
      const rootComment2 = await createComment({
        content: 'Another root comment',
        itemId: testItem.id,
        userId: testUser2.id,
      });

      const comments = await getItemComments(testItem.id);

      expect(comments.length).toBe(2); // Two root comments
      
      const parentInResults = comments.find(c => c.id === parentComment.id);
      expect(parentInResults).toBeDefined();
      expect(parentInResults!.replies).toBeDefined();
      expect(parentInResults!.replies!.length).toBe(2);
      
      const replyIds = parentInResults!.replies!.map(r => r.id);
      expect(replyIds).toContain(reply1.id);
      expect(replyIds).toContain(reply2.id);

      const rootComment2InResults = comments.find(c => c.id === rootComment2.id);
      expect(rootComment2InResults).toBeDefined();
      expect(rootComment2InResults!.replies!.length).toBe(0);
    });

    it('should return empty array for item with no comments', async () => {
      // Create another item without comments
      const emptyItem = await prisma.boardItem.create({
        data: {
          title: 'Empty Item',
          boardId: testBoard.id,
          columnId: testColumn.id,
          order: 1,
        },
      });

      const comments = await getItemComments(emptyItem.id);
      expect(comments).toEqual([]);

      // Clean up
      await prisma.boardItem.delete({ where: { id: emptyItem.id } });
    });
  });

  describe('updateComment', () => {
    it('should update comment content and mentions', async () => {
      const comment = await createComment({
        content: 'Original content',
        itemId: testItem.id,
        userId: testUser1.id,
      });

      const updatedComment = await updateComment(comment.id, testUser1.id, {
        content: 'Updated content with @Jane mention',
      });

      expect(updatedComment.content).toBe('Updated content with @Jane mention');
      expect(updatedComment.isEdited).toBe(true);
      expect(updatedComment.editedAt).toBeDefined();
      expect(updatedComment.mentions).toContain(testUser2.id);

      // Check notification was created for new mention
      const notifications = await prisma.notification.findMany({
        where: {
          recipientId: testUser2.id,
          type: 'MENTION',
        },
      });

      expect(notifications.length).toBe(1);
    });

    it('should throw error when user tries to update someone else\'s comment', async () => {
      const comment = await createComment({
        content: 'User 1 comment',
        itemId: testItem.id,
        userId: testUser1.id,
      });

      await expect(
        updateComment(comment.id, testUser2.id, {
          content: 'Trying to update someone else\'s comment',
        })
      ).rejects.toThrow('Permission denied');
    });

    it('should throw error for non-existent comment', async () => {
      await expect(
        updateComment('non-existent-id', testUser1.id, {
          content: 'Updated content',
        })
      ).rejects.toThrow('Comment not found');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment when user owns it', async () => {
      const comment = await createComment({
        content: 'Comment to delete',
        itemId: testItem.id,
        userId: testUser1.id,
      });

      await deleteComment(comment.id, testUser1.id);

      const deletedComment = await prisma.comment.findUnique({
        where: { id: comment.id },
      });

      expect(deletedComment).toBeNull();
    });

    it('should throw error when user tries to delete someone else\'s comment', async () => {
      const comment = await createComment({
        content: 'User 1 comment',
        itemId: testItem.id,
        userId: testUser1.id,
      });

      await expect(
        deleteComment(comment.id, testUser2.id)
      ).rejects.toThrow('Permission denied');
    });

    it('should throw error for non-existent comment', async () => {
      await expect(
        deleteComment('non-existent-id', testUser1.id)
      ).rejects.toThrow('Comment not found');
    });

    it('should cascade delete replies when parent is deleted', async () => {
      const parentComment = await createComment({
        content: 'Parent comment',
        itemId: testItem.id,
        userId: testUser1.id,
      });

      const reply = await createComment({
        content: 'Reply comment',
        itemId: testItem.id,
        userId: testUser2.id,
        parentId: parentComment.id,
      });

      await deleteComment(parentComment.id, testUser1.id);

      // Both parent and reply should be deleted due to cascade
      const deletedParent = await prisma.comment.findUnique({
        where: { id: parentComment.id },
      });
      const deletedReply = await prisma.comment.findUnique({
        where: { id: reply.id },
      });

      expect(deletedParent).toBeNull();
      expect(deletedReply).toBeNull();
    });
  });

  describe('getCommentById', () => {
    it('should return comment with user info', async () => {
      const comment = await createComment({
        content: 'Test comment',
        itemId: testItem.id,
        userId: testUser1.id,
      });

      const retrievedComment = await getCommentById(comment.id);

      expect(retrievedComment).toBeDefined();
      expect(retrievedComment!.id).toBe(comment.id);
      expect(retrievedComment!.content).toBe('Test comment');
      expect(retrievedComment!.user).toBeDefined();
      expect(retrievedComment!.user.firstName).toBe('John');
    });

    it('should return null for non-existent comment', async () => {
      const comment = await getCommentById('non-existent-id');
      expect(comment).toBeNull();
    });
  });
});