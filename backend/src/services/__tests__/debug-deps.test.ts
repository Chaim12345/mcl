import { describe, it, expect } from 'vitest';

describe('Debug Dependencies', () => {
  it('should import db client', async () => {
    try {
      const dbClient = await import('../../db/client.js');
      console.log('DB client keys:', Object.keys(dbClient));
      console.log('query function:', typeof dbClient.query);
      console.log('transaction function:', typeof dbClient.transaction);
      expect(dbClient.query).toBeDefined();
      expect(dbClient.transaction).toBeDefined();
    } catch (error) {
      console.error('DB client import failed:', error.message);
      throw error;
    }
  });

  it('should import generateId', async () => {
    try {
      const idUtils = await import('../../utils/id.js');
      console.log('ID utils keys:', Object.keys(idUtils));
      console.log('generateId function:', typeof idUtils.generateId);
      expect(idUtils.generateId).toBeDefined();
    } catch (error) {
      console.error('ID utils import failed:', error.message);
      throw error;
    }
  });

  it('should import workspace service', async () => {
    try {
      const workspaceService = await import('../workspaceService.js');
      console.log('Workspace service keys:', Object.keys(workspaceService));
      console.log('isWorkspaceMember function:', typeof workspaceService.isWorkspaceMember);
      expect(workspaceService.isWorkspaceMember).toBeDefined();
    } catch (error) {
      console.error('Workspace service import failed:', error.message);
      throw error;
    }
  });
});