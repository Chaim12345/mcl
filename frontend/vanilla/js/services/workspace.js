/**
 * Workspace Service for Vanilla JavaScript Frontend
 */

import { authService } from './auth.js';
import { eventBus } from '../utils/events.js';
import { state } from '../utils/state.js';

// Configuration constants
const API_BASE_URL = '/api';

/**
 * Workspace Service Class
 */
class WorkspaceService {
    constructor() {
        this.currentWorkspace = null;
        this.workspaces = [];
        this.members = [];
        
        // Initialize from storage
        this.initializeFromStorage();
    }
    
    /**
     * Initialize workspace state from local storage
     */
    initializeFromStorage() {
        try {
            const currentWorkspace = localStorage.getItem('current_workspace');
            const workspaces = localStorage.getItem('user_workspaces');
            
            if (currentWorkspace) {
                this.currentWorkspace = JSON.parse(currentWorkspace);
            }
            
            if (workspaces) {
                this.workspaces = JSON.parse(workspaces);
            }
            
            // Update global state
            state.set('workspace', {
                current: this.currentWorkspace,
                list: this.workspaces
            });
        } catch (error) {
            console.error('Error initializing workspace from storage:', error);
            this.clearStorage();
        }
    }
    
    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        return await authService.makeRequest(endpoint, options);
    }
    
    /**
     * Get all workspaces for current user
     */
    async getWorkspaces() {
        try {
            const response = await this.makeRequest('/workspaces');
            
            if (response.success) {
                this.workspaces = response.data.workspaces || [];
                this.updateStorage();
                
                // Update global state
                state.set('workspace', {
                    current: this.currentWorkspace,
                    list: this.workspaces
                });
                
                eventBus.emit('workspace:list_updated', { workspaces: this.workspaces });
                return this.workspaces;
            } else {
                throw new Error(response.message || 'Failed to fetch workspaces');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Get workspace by ID
     */
    async getWorkspaceById(workspaceId) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}`);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to fetch workspace');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Create new workspace
     */
    async createWorkspace(workspaceData) {
        try {
            const response = await this.makeRequest('/workspaces', {
                method: 'POST',
                body: JSON.stringify(workspaceData)
            });
            
            if (response.success) {
                const newWorkspace = response.data;
                this.workspaces.push(newWorkspace);
                this.updateStorage();
                
                // Update global state
                state.set('workspace', {
                    current: this.currentWorkspace,
                    list: this.workspaces
                });
                
                eventBus.emit('workspace:created', { workspace: newWorkspace });
                eventBus.emit('notification:success', { 
                    message: `Workspace "${newWorkspace.name}" created successfully!` 
                });
                
                return newWorkspace;
            } else {
                throw new Error(response.message || 'Failed to create workspace');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Update workspace
     */
    async updateWorkspace(workspaceId, updateData) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            
            if (response.success) {
                const updatedWorkspace = response.data;
                
                // Update in local list
                const index = this.workspaces.findIndex(w => w.id === workspaceId);
                if (index !== -1) {
                    this.workspaces[index] = updatedWorkspace;
                }
                
                // Update current workspace if it's the one being updated
                if (this.currentWorkspace && this.currentWorkspace.id === workspaceId) {
                    this.currentWorkspace = updatedWorkspace;
                }
                
                this.updateStorage();
                
                // Update global state
                state.set('workspace', {
                    current: this.currentWorkspace,
                    list: this.workspaces
                });
                
                eventBus.emit('workspace:updated', { workspace: updatedWorkspace });
                eventBus.emit('notification:success', { 
                    message: 'Workspace updated successfully!' 
                });
                
                return updatedWorkspace;
            } else {
                throw new Error(response.message || 'Failed to update workspace');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Delete workspace
     */
    async deleteWorkspace(workspaceId) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                // Remove from local list
                this.workspaces = this.workspaces.filter(w => w.id !== workspaceId);
                
                // Clear current workspace if it's the one being deleted
                if (this.currentWorkspace && this.currentWorkspace.id === workspaceId) {
                    this.currentWorkspace = null;
                }
                
                this.updateStorage();
                
                // Update global state
                state.set('workspace', {
                    current: this.currentWorkspace,
                    list: this.workspaces
                });
                
                eventBus.emit('workspace:deleted', { workspaceId });
                eventBus.emit('notification:success', { 
                    message: 'Workspace deleted successfully!' 
                });
                
                return true;
            } else {
                throw new Error(response.message || 'Failed to delete workspace');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Switch to workspace
     */
    async switchWorkspace(workspaceId) {
        try {
            const workspace = this.workspaces.find(w => w.id === workspaceId);
            if (!workspace) {
                // Fetch workspace if not in local list
                const fetchedWorkspace = await this.getWorkspaceById(workspaceId);
                this.currentWorkspace = fetchedWorkspace;
            } else {
                this.currentWorkspace = workspace;
            }
            
            this.updateStorage();
            
            // Update global state
            state.set('workspace', {
                current: this.currentWorkspace,
                list: this.workspaces
            });
            
            eventBus.emit('workspace:switched', { workspace: this.currentWorkspace });
            eventBus.emit('notification:info', { 
                message: `Switched to workspace "${this.currentWorkspace.name}"` 
            });
            
            return this.currentWorkspace;
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Get workspace members
     */
    async getWorkspaceMembers(workspaceId) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}/members`);
            
            if (response.success) {
                this.members = response.data.members || [];
                eventBus.emit('workspace:members_updated', { 
                    workspaceId, 
                    members: this.members 
                });
                return this.members;
            } else {
                throw new Error(response.message || 'Failed to fetch workspace members');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Invite member to workspace
     */
    async inviteMember(workspaceId, inviteData) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}/members/invite`, {
                method: 'POST',
                body: JSON.stringify(inviteData)
            });
            
            if (response.success) {
                eventBus.emit('workspace:member_invited', { 
                    workspaceId, 
                    invitation: response.data 
                });
                eventBus.emit('notification:success', { 
                    message: `Invitation sent to ${inviteData.email}` 
                });
                
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to send invitation');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Update member role
     */
    async updateMemberRole(workspaceId, memberId, role) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}/members/${memberId}`, {
                method: 'PUT',
                body: JSON.stringify({ role })
            });
            
            if (response.success) {
                // Update in local members list
                const memberIndex = this.members.findIndex(m => m.id === memberId);
                if (memberIndex !== -1) {
                    this.members[memberIndex].role = role;
                }
                
                eventBus.emit('workspace:member_role_updated', { 
                    workspaceId, 
                    memberId, 
                    role 
                });
                eventBus.emit('notification:success', { 
                    message: 'Member role updated successfully!' 
                });
                
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to update member role');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Remove member from workspace
     */
    async removeMember(workspaceId, memberId) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}/members/${memberId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                // Remove from local members list
                this.members = this.members.filter(m => m.id !== memberId);
                
                eventBus.emit('workspace:member_removed', { 
                    workspaceId, 
                    memberId 
                });
                eventBus.emit('notification:success', { 
                    message: 'Member removed successfully!' 
                });
                
                return true;
            } else {
                throw new Error(response.message || 'Failed to remove member');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Accept workspace invitation
     */
    async acceptInvitation(token) {
        try {
            const response = await this.makeRequest('/workspaces/invitations/accept', {
                method: 'POST',
                body: JSON.stringify({ token })
            });
            
            if (response.success) {
                const workspace = response.data.workspace;
                
                // Add to workspaces list if not already there
                const existingIndex = this.workspaces.findIndex(w => w.id === workspace.id);
                if (existingIndex === -1) {
                    this.workspaces.push(workspace);
                    this.updateStorage();
                }
                
                eventBus.emit('workspace:invitation_accepted', { workspace });
                eventBus.emit('notification:success', { 
                    message: `Welcome to workspace "${workspace.name}"!` 
                });
                
                return workspace;
            } else {
                throw new Error(response.message || 'Failed to accept invitation');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Get workspace statistics
     */
    async getWorkspaceStats(workspaceId) {
        try {
            const response = await this.makeRequest(`/workspaces/${workspaceId}/stats`);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to fetch workspace statistics');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Update storage with current workspace data
     */
    updateStorage() {
        try {
            if (this.currentWorkspace) {
                localStorage.setItem('current_workspace', JSON.stringify(this.currentWorkspace));
            } else {
                localStorage.removeItem('current_workspace');
            }
            
            if (this.workspaces.length > 0) {
                localStorage.setItem('user_workspaces', JSON.stringify(this.workspaces));
            } else {
                localStorage.removeItem('user_workspaces');
            }
        } catch (error) {
            console.error('Error updating workspace storage:', error);
        }
    }
    
    /**
     * Clear storage
     */
    clearStorage() {
        localStorage.removeItem('current_workspace');
        localStorage.removeItem('user_workspaces');
    }
    
    /**
     * Get current workspace
     */
    getCurrentWorkspace() {
        return this.currentWorkspace;
    }
    
    /**
     * Get all workspaces
     */
    getAllWorkspaces() {
        return this.workspaces;
    }
    
    /**
     * Get workspace members
     */
    getMembers() {
        return this.members;
    }
    
    /**
     * Check if user has permission in current workspace
     */
    hasPermission(permission) {
        if (!this.currentWorkspace) return false;
        
        const currentUser = authService.getCurrentUser();
        if (!currentUser) return false;
        
        const member = this.members.find(m => m.userId === currentUser.id);
        if (!member) return false;
        
        // Define role permissions
        const permissions = {
            admin: ['create', 'read', 'update', 'delete', 'invite', 'manage_members'],
            editor: ['create', 'read', 'update', 'invite'],
            viewer: ['read']
        };
        
        const rolePermissions = permissions[member.role] || [];
        return rolePermissions.includes(permission);
    }
    
    /**
     * Check if user is workspace owner
     */
    isOwner() {
        if (!this.currentWorkspace) return false;
        
        const currentUser = authService.getCurrentUser();
        if (!currentUser) return false;
        
        return this.currentWorkspace.ownerId === currentUser.id;
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.currentWorkspace = null;
        this.workspaces = [];
        this.members = [];
        this.clearStorage();
    }
}

// Create and export singleton instance
export const workspaceService = new WorkspaceService();

// Export the class for testing
export { WorkspaceService }; 