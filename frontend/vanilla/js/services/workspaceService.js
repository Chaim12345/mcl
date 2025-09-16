/**
 * Workspace Service with WebSocket Integration
 */

class WorkspaceService {
    constructor(websocketService) {
        this.currentWorkspace = null;
        this.workspaces = [];
        this.members = [];
        this.websocketService = websocketService;
        
        this.initializeFromStorage();
        this.initializeWebSocketListeners();
    }
    
    initializeFromStorage() {
        try {
            const currentWorkspace = localStorage.getItem('current_workspace');
            const workspaces = localStorage.getItem('user_workspaces');
            
            if (currentWorkspace) this.currentWorkspace = JSON.parse(currentWorkspace);
            if (workspaces) this.workspaces = JSON.parse(workspaces);
        } catch (error) {
            console.error('Error initializing workspace from storage:', error);
            this.clearStorage();
        }
    }
    
    initializeWebSocketListeners() {
        if (!window.eventBus) return;

        window.eventBus.on('workspace:update', (data) => {
            const { action, payload } = data;
            
            switch (action) {
                case 'created':
                    this.handleWorkspaceCreated(payload);
                    break;
                case 'updated':
                    this.handleWorkspaceUpdated(payload);
                    break;
                case 'deleted':
                    this.handleWorkspaceDeleted(payload);
                    break;
            }
        });
    }
    
    async makeRequest(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            ...options
        };
        
        if (options.body) {
            config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }
        
        const response = await fetch(`/api${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || 'Request failed');
        return { success: true, data };
    }
    
    async getWorkspaces() {
        try {
            const response = await this.makeRequest('/workspaces');
            this.workspaces = response.data.workspaces || [];
            this.updateStorage();
            
            window.eventBus?.emit('workspace:list_updated', { workspaces: this.workspaces });
            
            this.workspaces.forEach(workspace => {
                this.websocketService?.subscribeToWorkspace(workspace.id);
            });
            
            return this.workspaces;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async getWorkspaceById(workspaceId) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}`);
            return response.data;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async createWorkspace(workspaceData) {
        try {
            const response = await this.makeRequest('/workspaces', {
                method: 'POST',
                body: workspaceData
            });
            
            const newWorkspace = response.data;
            this.workspaces.push(newWorkspace);
            this.updateStorage();
            
            window.eventBus?.emit('workspace:created', { workspace: newWorkspace });
            this.websocketService?.subscribeToWorkspace(newWorkspace.id);
            
            return newWorkspace;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async updateWorkspace(workspaceId, updateData) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}`, {
                method: 'PUT',
                body: updateData
            });
            
            const updatedWorkspace = response.data;
            
            const index = this.workspaces.findIndex(w => w.id === workspaceId);
            if (index !== -1) {
                this.workspaces[index] = updatedWorkspace;
            }
            
            if (this.currentWorkspace && this.currentWorkspace.id === workspaceId) {
                this.currentWorkspace = updatedWorkspace;
            }
            
            this.updateStorage();
            window.eventBus?.emit('workspace:updated', { workspace: updatedWorkspace });
            
            return updatedWorkspace;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async deleteWorkspace(workspaceId) {
        try {
            await this.makeRequest(`/workspaces/${workspaceId}`, { method: 'DELETE' });
            
            this.workspaces = this.workspaces.filter(w => w.id !== workspaceId);
            
            if (this.currentWorkspace && this.currentWorkspace.id === workspaceId) {
                this.currentWorkspace = null;
            }
            
            this.updateStorage();
            this.websocketService?.unsubscribe(`workspace:${workspaceId}`);
            window.eventBus?.emit('workspace:deleted', { workspaceId });
            
            return true;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async switchWorkspace(workspaceId) {
        try {
            const workspace = this.workspaces.find(w => w.id === workspaceId);
            if (!workspace) {
                const fetchedWorkspace = await this.getWorkspaceById(workspaceId);
                this.currentWorkspace = fetchedWorkspace;
            } else {
                this.currentWorkspace = workspace;
            }
            
            this.updateStorage();
            window.eventBus?.emit('workspace:switched', { workspace: this.currentWorkspace });
            this.websocketService?.subscribeToWorkspace(workspaceId);
            
            return this.currentWorkspace;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    async getWorkspaceMembers(workspaceId) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}/members`);
            this.members = response.data.members || [];
            window.eventBus?.emit('workspace:members_updated', { workspaceId, members: this.members });
            return this.members;
        } catch (error) {
            window.eventBus?.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    handleWorkspaceCreated(workspace) {
        if (!this.workspaces.find(w => w.id === workspace.id)) {
            this.workspaces.push(workspace);
            this.websocketService?.subscribeToWorkspace(workspace.id);
            window.eventBus?.emit('workspace:created', { workspace, source: 'websocket' });
        }
    }
    
    handleWorkspaceUpdated(workspace) {
        const index = this.workspaces.findIndex(w => w.id === workspace.id);
        if (index !== -1) {
            this.workspaces[index] = workspace;
            if (this.currentWorkspace && this.currentWorkspace.id === workspace.id) {
                this.currentWorkspace = workspace;
            }
            window.eventBus?.emit('workspace:updated', { workspace, source: 'websocket' });
        }
    }
    
    handleWorkspaceDeleted(workspaceId) {
        this.workspaces = this.workspaces.filter(w => w.id !== workspaceId);
        
        if (this.currentWorkspace && this.currentWorkspace.id === workspaceId) {
            this.currentWorkspace = null;
        }
        
        this.updateStorage();
        this.websocketService?.unsubscribe(`workspace:${workspaceId}`);
        window.eventBus?.emit('workspace:deleted', { workspaceId, source: 'websocket' });
    }
    
    updateStorage() {
        try {
            if (this.currentWorkspace) {
                localStorage.setItem('current_workspace', JSON.stringify(this.currentWorkspace));
            }
            localStorage.setItem('user_workspaces', JSON.stringify(this.workspaces));
        } catch (error) {
            console.error('Error updating workspace storage:', error);
        }
    }
    
    clearStorage() {
        localStorage.removeItem('current_workspace');
        localStorage.removeItem('user_workspaces');
    }
    
    getCurrentWorkspace() {
        return this.currentWorkspace;
    }
    
    getWorkspacesList() {
        return [...this.workspaces];
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkspaceService;
} else if (typeof window !== 'undefined') {
    window.WorkspaceService = WorkspaceService;
}