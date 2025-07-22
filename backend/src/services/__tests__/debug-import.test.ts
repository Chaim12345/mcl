import { describe, it, expect } from 'vitest';

describe('Debug Import', () => {
  it('should show what is actually exported', async () => {
    try {
      const boardServiceModule = await import('../boardService.js');
      console.log('Full module:', boardServiceModule);
      console.log('Module keys:', Object.keys(boardServiceModule));
      console.log('createBoard:', boardServiceModule.createBoard);
      console.log('typeof createBoard:', typeof boardServiceModule.createBoard);
      
      // Let's also check if there are any errors during module loading
      expect(boardServiceModule).toBeDefined();
    } catch (error) {
      console.error('Import failed:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  });
});