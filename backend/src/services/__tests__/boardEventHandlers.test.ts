import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BoardEventHandler } from '../boardEventHandlers.js';
import { createActivity } from '../activityService.js';
import { checkBoardPermission } from '../../middleware/socketAuth.js';

// Mock dependencies
vi.mock('../../middleware/socketAuth.js', () => ({
  checkBoardPermission: vi.fn(),
}));

vi.mock('../activityService.js', () => ({
  createActivity: vi.fn(),
  ACTIVITY_ACTIONS: {
    ITEM_CREATED: 'item_created',
    ITEM_UPDATED: 'item_updated',
    ITEM_DELETED: 'item_deleted',
    ITEM_MOVED: 'item_moved',
    COMMENT_CREATED: 'comment_created',
  },
}));

describe('BoardEventHandler', () => {
  let mockSocket: any;
  let mockEmit: any;
  let mockTo: any;
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock socket
    mockEmit = vi.fn();
    mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
    
    mockSocket = {
      id: 'socket-id-123',
      userId: 'user-123',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'avatar.jpg',
      },
      emit: vi.fn(),
      to: mockTo,
      join: vi.fn(),
      leave: vi.fn(),
    };
    
    // Mock board permission check to return true by default
    (checkBoardPermission as any).mockResolvedValue(true);
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('handleJoinBoard', () => {
    it('should join the board room and emit events', async () => {
      await BoardEventHandler.handleJoinBoard(mockSocket, 'board-123');
      
      expect(checkBoardPermission).toHaveBeenCalledWith('user-123', 'board-123');
      expect(mockSocket.join).toHaveBeenCalledWith('board:board-123');
      expect(mockSocket.to).toHaveBeenCalledWith('board:board-123');
      expect(mockEmit).toHaveBeenCalledWith('user-joined-board', expect.objectContaining({
        user: expect.objectContaining({
          id: 'user-123',
        }),
        boardId: 'board-123',
      }));
      expect(mockSocket.emit).toHaveBeenCalledWith('board-joined', expect.objectContaining({
        boardId: 'board-123',
      }));
      expect(mockSocket.emit).toHaveBeenCalledWith('board-users', expect.objectContaining({
        boardId: 'board-123',
      }));
    });
    
    it('should emit error when user does not have access', async () => {
      (checkBoardPermission as any).mockResolvedValue(false);
      
      await BoardEventHandler.handleJoinBoard(mockSocket, 'board-123');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        type: 'BOARD_ACCESS_DENIED',
      }));
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });
  
  describe('handleBoardUpdate', () => {
    it('should broadcast board update and create activity log', async () => {
      const updateData = {
        boardId: 'board-123',
        type: 'item_updated' as const,
        itemId: 'item-123',
        changes: { title: 'New Title' },
      };
      
      await BoardEventHandler.handleBoardUpdate(mockSocket, updateData);
      
      expect(checkBoardPermission).toHaveBeenCalledWith('user-123', 'board-123');
      expect(mockSocket.to).toHaveBeenCalledWith('board:board-123');
      expect(mockEmit).toHaveBeenCalledWith('board-updated', expect.objectContaining({
        boardId: 'board-123',
        type: 'item_updated',
        itemId: 'item-123',
        changes: { title: 'New Title' },
        user: expect.objectContaining({
          id: 'user-123',
        }),
      }));
      expect(createActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: expect.any(String),
        entityId: 'item-123',
        entityType: 'item',
        itemId: 'item-123',
        userId: 'user-123',
      }));
    });
    
    it('should emit error when user does not have access', async () => {
      (checkBoardPermission as any).mockResolvedValue(false);
      
      await BoardEventHandler.handleBoardUpdate(mockSocket, {
        boardId: 'board-123',
        type: 'item_updated',
        itemId: 'item-123',
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        type: 'BOARD_ACCESS_DENIED',
      }));
      expect(mockSocket.to).not.toHaveBeenCalled();
      expect(createActivity).not.toHaveBeenCalled();
    });
  });
  
  describe('handleItemMove', () => {
    it('should broadcast item move and create activity log', async () => {
      const moveData = {
        boardId: 'board-123',
        itemId: 'item-123',
        fromPosition: 1,
        toPosition: 2,
        fromColumn: 'column-1',
        toColumn: 'column-2',
      };
      
      await BoardEventHandler.handleItemMove(mockSocket, moveData);
      
      expect(checkBoardPermission).toHaveBeenCalledWith('user-123', 'board-123');
      expect(mockSocket.to).toHaveBeenCalledWith('board:board-123');
      expect(mockEmit).toHaveBeenCalledWith('item-moved', expect.objectContaining({
        boardId: 'board-123',
        itemId: 'item-123',
        fromPosition: 1,
        toPosition: 2,
        user: expect.objectContaining({
          id: 'user-123',
        }),
      }));
      expect(createActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: expect.any(String),
        entityId: 'item-123',
        entityType: 'item',
        itemId: 'item-123',
        userId: 'user-123',
        metadata: expect.objectContaining({
          fromPosition: 1,
          toPosition: 2,
        }),
      }));
    });
  });
  
  describe('handleCommentAdded', () => {
    it('should broadcast comment and create activity log', async () => {
      const commentData = {
        boardId: 'board-123',
        itemId: 'item-123',
        commentId: 'comment-123',
        comment: { content: 'Test comment' },
      };
      
      await BoardEventHandler.handleCommentAdded(mockSocket, commentData);
      
      expect(checkBoardPermission).toHaveBeenCalledWith('user-123', 'board-123');
      expect(mockSocket.to).toHaveBeenCalledWith('board:board-123');
      expect(mockEmit).toHaveBeenCalledWith('comment-added', expect.objectContaining({
        boardId: 'board-123',
        itemId: 'item-123',
        comment: { content: 'Test comment' },
        user: expect.objectContaining({
          id: 'user-123',
        }),
      }));
      expect(createActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: expect.any(String),
        entityId: 'comment-123',
        entityType: 'comment',
        itemId: 'item-123',
        userId: 'user-123',
      }));
    });
  });
  
  describe('handleTyping', () => {
    it('should broadcast typing indicator', async () => {
      const typingData = {
        boardId: 'board-123',
        itemId: 'item-123',
        isTyping: true,
      };
      
      await BoardEventHandler.handleTyping(mockSocket, typingData);
      
      expect(checkBoardPermission).toHaveBeenCalledWith('user-123', 'board-123');
      expect(mockSocket.to).toHaveBeenCalledWith('board:board-123');
      expect(mockEmit).toHaveBeenCalledWith('user-typing', expect.objectContaining({
        boardId: 'board-123',
        itemId: 'item-123',
        isTyping: true,
        user: expect.objectContaining({
          id: 'user-123',
        }),
      }));
    });
  });
  
  describe('handleCursorPosition', () => {
    it('should broadcast cursor position', async () => {
      const cursorData = {
        boardId: 'board-123',
        x: 100,
        y: 200,
        itemId: 'item-123',
      };
      
      await BoardEventHandler.handleCursorPosition(mockSocket, cursorData);
      
      expect(checkBoardPermission).toHaveBeenCalledWith('user-123', 'board-123');
      expect(mockSocket.to).toHaveBeenCalledWith('board:board-123');
      expect(mockEmit).toHaveBeenCalledWith('user-cursor', expect.objectContaining({
        boardId: 'board-123',
        x: 100,
        y: 200,
        itemId: 'item-123',
        user: expect.objectContaining({
          id: 'user-123',
        }),
      }));
    });
  });
});