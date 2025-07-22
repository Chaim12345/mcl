// Minimal board service to test exports
import { query, transaction } from '../db/client.js';
import { generateId } from '../utils/id.js';
import { isWorkspaceMember } from './workspaceService.js';

export interface CreateBoardData {
  name: string;
  description?: string;
  icon?: string;
  workspaceId: string;
}

/**
 * Default columns to create when a new board is created
 */
const DEFAULT_COLUMNS = [
  { name: 'To Do', order: 0 },
  { name: 'In Progress', order: 1 },
  { name: 'Review', order: 2 },
  { name: 'Done', order: 3 }
];

/**
 * Validate that a user has access to a workspace
 */
async function validateWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
  const membershipInfo = await isWorkspaceMember(workspaceId, userId);
  if (!membershipInfo.isMember) {
    throw new Error('User does not have access to this workspace');
  }
}

export async function createBoard(data: CreateBoardData, userId: string): Promise<any> {
  return { id: 'test', name: data.name };
}