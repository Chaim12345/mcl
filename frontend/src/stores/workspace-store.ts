import { create } from 'zustand';
import { Workspace } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (workspaceId: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,
  error: null,
  
  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  addWorkspace: (workspace) => 
    set((state) => ({ 
      workspaces: [...state.workspaces, workspace] 
    })),
  updateWorkspace: (workspace) => 
    set((state) => ({ 
      workspaces: state.workspaces.map(w => 
        w.id === workspace.id ? workspace : w
      ),
      currentWorkspace: state.currentWorkspace?.id === workspace.id 
        ? workspace 
        : state.currentWorkspace
    })),
  removeWorkspace: (workspaceId) => 
    set((state) => ({ 
      workspaces: state.workspaces.filter(w => w.id !== workspaceId),
      currentWorkspace: state.currentWorkspace?.id === workspaceId 
        ? null 
        : state.currentWorkspace
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));