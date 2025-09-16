/**
 * User Management Service
 * Handles user operations, workspace membership, and user administration
 */

import { WebSocketService } from './websocket.js';
import { WorkspaceService } from './workspaceService.js';
import { EventEmitter } from '../utils/eventEmitter.js';

export class UserManagementService extends EventEmitter {
  constructor() {
    super();
    this.baseURL = '/api/v1';
    this.wsService = new WebSocketService();
    this.workspaceService = new WorkspaceService();
    this.currentUser = null;
    this.users = new Map();
    this.workspaceMembers = new Map();
  }

  /**
   * Initialize the user management service
   */
  async init() {
    try {
      await this.fetchCurrentUser();
      await this.fetchWorkspaceMembers();
      this.setupWebSocketListeners();
    } catch (error) {
      console.error('Failed to initialize user management service:', error);
    }
  }

  /**
   * Get current authenticated user
   */
  async fetchCurrentUser() {
    try {
      const response = await fetch(`${this.baseURL}/users/me`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        this.currentUser = await response.json();
        this.emit('currentUserUpdated', this.currentUser);
        return this.currentUser;
      }
      throw new Error('Failed to fetch current user');
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.search) params.append('search', options.search);
      if (options.role) params.append('role', options.role);
      if (options.status) params.append('status', options.status);

      const response = await fetch(`${this.baseURL}/users?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        data.users.forEach(user => this.users.set(user.id, user));
        return data;
      }
      throw new Error('Failed to fetch users');
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get users by workspace
   */
  async getWorkspaceUsers(workspaceId) {
    try {
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/users`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const users = await response.json();
        users.forEach(user => this.workspaceMembers.set(user.id, user));
        return users;
      }
      throw new Error('Failed to fetch workspace users');
    } catch (error) {
      console.error('Error fetching workspace users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const user = await response.json();
        this.users.set(userId, user);
        return user;
      }
      throw new Error('Failed to fetch user');
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updates) {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        this.users.set(userId, updatedUser);
        
        if (userId === this.currentUser?.id) {
          this.currentUser = updatedUser;
          this.emit('currentUserUpdated', updatedUser);
        }
        
        this.emit('userUpdated', updatedUser);
        return updatedUser;
      }
      throw new Error('Failed to update user');
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Search users with autocomplete
   */
  async searchUsers(query, options = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: options.limit || 10,
        ...options.filters
      });

      const response = await fetch(`${this.baseURL}/users/search?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to search users');
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Invite user to workspace
   */
  async inviteUserToWorkspace(workspaceId, email, role = 'member') {
    try {
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, role })
      });
      
      if (response.ok) {
        const invitation = await response.json();
        this.emit('userInvited', invitation);
        return invitation;
      }
      throw new Error('Failed to invite user');
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  }

  /**
   * Remove user from workspace
   */
  async removeUserFromWorkspace(workspaceId, userId) {
    try {
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        this.workspaceMembers.delete(userId);
        this.emit('userRemovedFromWorkspace', { workspaceId, userId });
        return true;
      }
      throw new Error('Failed to remove user from workspace');
    } catch (error) {
      console.error('Error removing user from workspace:', error);
      throw error;
    }
  }

  /**
   * Update user's role in workspace
   */
  async updateUserRole(workspaceId, userId, role) {
    try {
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ role })
      });
      
      if (response.ok) {
        const member = await response.json();
        this.workspaceMembers.set(userId, member);
        this.emit('userRoleUpdated', { workspaceId, userId, role });
        return member;
      }
      throw new Error('Failed to update user role');
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      const response = await fetch(`${this.baseURL}/users/${userId}/activity?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch user activity');
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }

  /**
   * Bulk operations on users
   */
  async bulkUserOperation(operation, userIds, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}/users/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ operation, userIds, ...options })
      });
      
      if (response.ok) {
        const result = await response.json();
        this.emit('bulkOperationCompleted', { operation, userIds, result });
        return result;
      }
      throw new Error('Failed to perform bulk operation');
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      throw error;
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(userId, file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${this.baseURL}/users/${userId}/avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (response.ok) {
        const { avatarUrl } = await response.json();
        const updatedUser = { ...this.users.get(userId), avatarUrl };
        this.users.set(userId, updatedUser);
        
        if (userId === this.currentUser?.id) {
          this.currentUser = updatedUser;
          this.emit('currentUserUpdated', updatedUser);
        }
        
        this.emit('userUpdated', updatedUser);
        return avatarUrl;
      }
      throw new Error('Failed to upload avatar');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  }

  /**
   * Get workspace invitations
   */
  async getWorkspaceInvitations(workspaceId) {
    try {
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/invitations`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch invitations');
    } catch (error) {
      console.error('Error fetching invitations:', error);
      throw error;
    }
  }

  /**
   * Cancel workspace invitation
   */
  async cancelInvitation(workspaceId, invitationId) {
    try {
      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        this.emit('invitationCancelled', { workspaceId, invitationId });
        return true;
      }
      throw new Error('Failed to cancel invitation');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      throw error;
    }
  }

  /**
   * Accept workspace invitation
   */
  async acceptInvitation(invitationId) {
    try {
      const response = await fetch(`${this.baseURL}/invitations/${invitationId}/accept`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        this.emit('invitationAccepted', result);
        return result;
      }
      throw new Error('Failed to accept invitation');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Setup WebSocket listeners for real-time updates
   */
  setupWebSocketListeners() {
    // Listen for user-related WebSocket events
    this.wsService.on('userUpdated', (data) => {
      this.users.set(data.user.id, data.user);
      if (data.user.id === this.currentUser?.id) {
        this.currentUser = data.user;
        this.emit('currentUserUpdated', data.user);
      }
      this.emit('userUpdated', data.user);
    });

    this.wsService.on('userInvited', (data) => {
      this.emit('userInvited', data);
    });

    this.wsService.on('userRemovedFromWorkspace', (data) => {
      this.workspaceMembers.delete(data.userId);
      this.emit('userRemovedFromWorkspace', data);
    });

    this.wsService.on('userRoleUpdated', (data) => {
      if (this.workspaceMembers.has(data.userId)) {
        const member = this.workspaceMembers.get(data.userId);
        member.role = data.role;
        this.workspaceMembers.set(data.userId, member);
      }
      this.emit('userRoleUpdated', data);
    });
  }

  /**
   * Get cached user data
   */
  getCachedUser(userId) {
    return this.users.get(userId);
  }

  /**
   * Get cached workspace member data
   */
  getCachedWorkspaceMember(userId) {
    return this.workspaceMembers.get(userId);
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId, permission, workspaceId = null) {
    const user = this.users.get(userId) || this.currentUser;
    if (!user) return false;

    // Admin has all permissions
    if (user.role === 'admin' || user.role === 'owner') return true;

    // Check workspace-specific permissions
    if (workspaceId) {
      const member = this.workspaceMembers.get(userId);
      if (!member) return false;

      const rolePermissions = {
        owner: ['read', 'write', 'delete', 'invite', 'manage'],
        admin: ['read', 'write', 'delete', 'invite', 'manage'],
        member: ['read', 'write', 'invite'],
        viewer: ['read']
      };

      return rolePermissions[member.role]?.includes(permission) || false;
    }

    // Basic role-based permissions
    const rolePermissions = {
      admin: ['read', 'write', 'delete', 'manage'],
      member: ['read', 'write'],
      viewer: ['read']
    };

    return rolePermissions[user.role]?.includes(permission) || false;
  }

  /**
   * Refresh user data
   */
  async refreshUserData(userId) {
    try {
      const user = await this.getUserById(userId);
      this.users.set(userId, user);
      return user;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  }

  /**
   * Refresh workspace members
   */
  async refreshWorkspaceMembers(workspaceId) {
    try {
      const members = await this.getWorkspaceUsers(workspaceId);
      this.workspaceMembers.clear();
      members.forEach(member => this.workspaceMembers.set(member.id, member));
      return members;
    } catch (error) {
      console.error('Error refreshing workspace members:', error);
      throw error;
    }
  }
}

// Create global instance
export const userManagementService = new UserManagementService();