import { describe, it, expect } from 'vitest';

describe('Debug Minimal', () => {
  it('should import minimal board service', async () => {
    try {
      const minimalService = await import('../boardService-minimal.js');
      console.log('Minimal service keys:', Object.keys(minimalService));
      console.log('createBoard function:', typeof minimalService.createBoard);
      expect(minimalService.createBoard).toBeDefined();
      expect(typeof minimalService.createBoard).toBe('function');
    } catch (error) {
      console.error('Minimal service import failed:', error.message);
      throw error;
    }
  });
});