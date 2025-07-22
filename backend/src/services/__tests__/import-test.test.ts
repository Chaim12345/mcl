import { describe, it, expect } from 'vitest';

describe('Import Test', () => {
  it('should import board service types', async () => {
    try {
      const { CreateBoardData, UpdateBoardData } = await import('../boardService.js');
      expect(CreateBoardData).toBeDefined();
      expect(UpdateBoardData).toBeDefined();
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  });

  it('should import board service functions', async () => {
    try {
      const { createBoard, getBoardById, updateBoard, deleteBoard } = await import('../boardService.js');
      expect(typeof createBoard).toBe('function');
      expect(typeof getBoardById).toBe('function');
      expect(typeof updateBoard).toBe('function');
      expect(typeof deleteBoard).toBe('function');
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  });
});