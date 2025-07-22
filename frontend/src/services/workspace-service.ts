import { api } from './api-client';
import { Workspace, WorkspaceMember } from '@/types';

export const workspaceService = {
  getWorkspaces: async () => {
    try {
      const result = await api.get<Workspace[]>('/workspaces');
      return result || [];
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      return [];
    }
  },
    
  getWorkspace: (id: string) => 
    api.get<Workspace>(`/workspaces/${id}`),
    
  createWorkspace: (data: { name: string; description?: string }) => 
    api.post<Workspace>('/workspaces', data),
    
  updateWorkspace: (id: string, data: { name?: string; description?: string }) => 
    api.put<Workspace>(`/workspaces/${id}`, data),
    
  deleteWorkspace: (id: string) => 
    api.delete<{ success: boolean }>(`/workspaces/${id}`),
    
  getWorkspaceMembers: (workspaceId: string) => 
    api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
    
  inviteToWorkspace: (workspaceId: string, data: { email: string; role: 'admin' | 'member' }) => 
    api.post<{ success: boolean }>(`/workspaces/${workspaceId}/invite`, data),
    
  updateMemberRole: (workspaceId: string, userId: string, role: 'admin' | 'member') => 
    api.put<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}`, { role }),
    
  removeMember: (workspaceId: string, userId: string) => 
    api.delete<{ success: boolean }>(`/workspaces/${workspaceId}/members/${userId}`),
};