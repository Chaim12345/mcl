import { describe, it, expect } from 'vitest';

describe('Auth Routes Import Test', () => {
  it('should import auth routes', async () => {
    try {
      const authRoutes = await import('../auth.js');
      expect(authRoutes.default).toBeDefined();
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  });
});