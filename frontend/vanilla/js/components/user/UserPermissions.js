/**
 * User Permissions Component
 * Manages user roles and permissions with granular control
 */

import { userManagementService } from '../../services/userManagement.js';
import { EventEmitter } from '../../utils/eventEmitter.js';

export class UserPermissions extends EventEmitter {
  constructor(container, userId, workspaceId = null, options = {}) {
    super();
    this.container = container;
    this.userId = userId;
    this.workspaceId = workspaceId;
    this.options = {
      mode: 'edit', // 'edit', 'view', 'admin'
      showSystemPermissions: false,
      showWorkspacePermissions: true,
      allowCustomPermissions: true,
      ...options
    };
    
    this.user = null;
    this.currentPermissions = [];
    this.availablePermissions = [];
    this.rolePermissions = this.getRolePermissions();
    
    this.init();
  }

  getRolePermissions() {
    return {
      owner: {
        system: ['read', 'write', 'delete', 'manage_users', 'manage_workspaces', 'manage_settings'],
        workspace: ['read', 'write', 'delete', 'invite', 'manage_members', 'manage_boards', 'manage_settings']
      },
      admin: {
        system: ['read', 'write', 'manage_users', 'manage_workspaces'],
        workspace: ['read', 'write', 'delete', 'invite', 'manage_members', 'manage_boards']
      },
      member: {
        system: ['read', 'write'],
        workspace: ['read', 'write', 'invite']
      },
      viewer: {
        system: ['read'],
        workspace: ['read']
      }
    };
  }

  async init() {
    await this.loadUser();
    this.render();
    this.attachEventListeners();
  }

  async loadUser() {
    try {
      this.user = await userManagementService.getUserById(this.userId);
      this.currentPermissions = this.user.permissions || [];
      
      if (this.workspaceId) {
        // Load workspace-specific permissions
        const member = await this.getWorkspaceMember();
        this.currentPermissions = member.permissions || [];
      }
    } catch (error) {
      console.error('Error loading user:', error);
      this.showError('Failed to load user permissions');
    }
  }

  async getWorkspaceMember() {
    // This would fetch workspace member details
    return {
      id: this.userId,
      role: 'member',
      permissions: []
    };
  }

  render() {
    if (!this.user) {
      this.container.innerHTML = '<div class="error">User not found</div>';
      return;
    }

    this.container.innerHTML = `
      <div class="user-permissions-container">
        ${this.renderHeader()}
        ${this.renderRoleSection()}
        ${this.renderPermissionsSection()}
        ${this.renderAdvancedSettings()}
        ${this.renderActions()}
      </div>
    `;
  }

  renderHeader() {
    return `
      <div class="permissions-header">
        <div class="user-info">
          <img src="${this.user.avatarUrl || '/assets/default-avatar.png'}" 
               alt="${this.user.name}" 
               class="user-avatar">
          <div>
            <h3>${this.user.name}</h3>
            <p>${this.user.email}</p>
          </div>
        </div>
        <div class="current-role">
          <span class="role-badge">${this.user.role || 'No role assigned'}</span>
        </div>
      </div>
    `;
  }

  renderRoleSection() {
    return `
      <div class="role-section">
        <h4>Role Assignment</h4>
        <p>Select a role to automatically assign appropriate permissions</p>
        
        <div class="role-options">
          ${Object.keys(this.rolePermissions).map(role => this.renderRoleOption(role)).join('')}
        </div>
        
        <div class="role-description" id="roleDescription">
          ${this.getRoleDescription(this.user.role || 'member')}
        </div>
      </div>
    `;
  }

  renderRoleOption(role) {
    const isSelected = this.user.role === role;
    const permissions = this.rolePermissions[role];
    
    return `
      <label class="role-card ${isSelected ? 'selected' : ''}">
        <input type="radio" 
               name="userRole" 
               value="${role}" 
               ${isSelected ? 'checked' : ''}
               ${!this.canEdit() ? 'disabled' : ''}>
        <div class="role-content">
          <div class="role-header">
            <div class="role-icon">${this.getRoleIcon(role)}</div>
            <div class="role-title">${this.capitalizeFirst(role)}</div>
          </div>
          <div class="role-permissions">
            <div class="system-permissions">
              <strong>System:</strong> ${permissions.system.length} permissions
            </div>
            ${this.workspaceId ? `
              <div class="workspace-permissions">
                <strong>Workspace:</strong> ${permissions.workspace.length} permissions
              </div>
            ` : ''}
          </div>
        </div>
      </label>
    `;
  }

  renderPermissionsSection() {
    return `
      <div class="permissions-section">
        <h4>Individual Permissions</h4>
        <p>Fine-tune access by enabling or disabling specific permissions</p>
        
        <div class="permissions-tabs">
          ${this.workspaceId ? `
            <button class="tab-btn active" data-tab="workspace">Workspace Permissions</button>
          ` : ''}
          ${this.options.showSystemPermissions ? `
            <button class="tab-btn ${!this.workspaceId ? 'active' : ''}" data-tab="system">System Permissions</button>
          ` : ''}
        </div>
        
        <div class="permissions-content">
          ${this.renderPermissionsList('workspace')}
          ${this.options.showSystemPermissions ? this.renderPermissionsList('system') : ''}
        </div>
      </div>
    `;
  }

  renderPermissionsList(type) {
    const permissions = this.getPermissionsByType(type);
    
    return `
      <div class="permissions-list" data-type="${type}" ${type === 'system' && this.workspaceId ? 'style="display: none;"' : ''}>
        ${permissions.map(permission => this.renderPermissionItem(permission)).join('')}
      </div>
    `;
  }

  renderPermissionItem(permission) {
    const isGranted = this.hasPermission(permission.key);
    const isInherited = this.isPermissionInherited(permission.key);
    
    return `
      <div class="permission-item ${isInherited ? 'inherited' : ''}">
        <div class="permission-info">
          <div class="permission-header">
            <h5>${permission.name}</h5>
            ${isInherited ? '<span class="inheritance-badge">Inherited from role</span>' : ''}
          </div>
          <p>${permission.description}</p>
          ${permission.scope ? `<small class="permission-scope">${permission.scope}</small>` : ''}
        </div>
        
        <div class="permission-controls">
          <label class="permission-toggle">
            <input type="checkbox" 
                   data-permission="${permission.key}"
                   ${isGranted ? 'checked' : ''}
                   ${isInherited || !this.canEdit() ? 'disabled' : ''}>
            <span class="toggle-slider"></span>
          </label>
          
          ${!isInherited && this.options.allowCustomPermissions ? `
            <button class="permission-detail-btn" data-permission="${permission.key}">
              <i class="icon-settings"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderAdvancedSettings() {
    if (!this.options.allowCustomPermissions) return '';
    
    return `
      <div class="advanced-settings">
        <h4>Advanced Settings</h4>
        
        <div class="setting-group">
          <label class="setting-item">
            <input type="checkbox" id="overrideRole" ${this.user.overrideRole ? 'checked' : ''}>
            <span>Override role-based permissions</span>
            <small>Allow custom permissions to take precedence over role defaults</small>
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-item">
            <input type="checkbox" id="temporaryAccess" ${this.user.temporaryAccess ? 'checked' : ''}>
            <span>Temporary access</span>
            <small>Set an expiration date for these permissions</small>
          </label>
          
          ${this.user.temporaryAccess ? `
            <div class="date-input-group">
              <label>Expiration Date</label>
              <input type="date" 
                     class="form-control" 
                     id="expirationDate"
                     value="${this.user.expirationDate || ''}"
                     min="${new Date().toISOString().split('T')[0]}">
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderActions() {
    if (!this.canEdit()) return '';
    
    return `
      <div class="permissions-actions">
        <button type="button" class="btn btn-secondary" data-action="reset">
          Reset to Role Defaults
        </button>
        <button type="button" class="btn btn-primary" data-action="save">
          Save Changes
        </button>
      </div>
    `;
  }

  getRoleIcon(role) {
    const icons = {
      owner: '👑',
      admin: '⚙️',
      member: '👤',
      viewer: '👁️'
    };
    return icons[role] || '❓';
  }

  getRoleDescription(role) {
    const descriptions = {
      owner: 'Full control over the workspace and all its resources. Can manage other admins and change workspace settings.',
      admin: 'Can manage workspace content, members, and settings. Cannot delete the workspace or change owner.',
      member: 'Can actively contribute to workspace content and invite others. Cannot manage workspace settings or other members.',
      viewer: 'Can view workspace content but cannot make changes or invite others.'
    };
    return descriptions[role] || 'No description available';
  }

  getPermissionsByType(type) {
    const permissions = {
      workspace: [
        {
          key: 'read_boards',
          name: 'Read Boards',
          description: 'View all boards in the workspace',
          scope: 'All boards'
        },
        {
          key: 'create_boards',
          name: 'Create Boards',
          description: 'Create new boards within the workspace',
          scope: 'Workspace level'
        },
        {
          key: 'edit_boards',
          name: 'Edit Boards',
          description: 'Modify board settings and structure',
          scope: 'Boards owned or assigned'
        },
        {
          key: 'delete_boards',
          name: 'Delete Boards',
          description: 'Remove boards from the workspace',
          scope: 'Boards owned or assigned'
        },
        {
          key: 'invite_members',
          name: 'Invite Members',
          description: 'Invite new users to join the workspace',
          scope: 'Workspace level'
        },
        {
          key: 'manage_members',
          name: 'Manage Members',
          description: 'Change member roles and remove members',
          scope: 'Non-owner members'
        },
        {
          key: 'edit_items',
          name: 'Edit Items',
          description: 'Create and modify items on boards',
          scope: 'All accessible items'
        },
        {
          key: 'comment_items',
          name: 'Comment on Items',
          description: 'Add comments to items and discussions',
          scope: 'All accessible items'
        },
        {
          key: 'export_data',
          name: 'Export Data',
          description: 'Export workspace data and reports',
          scope: 'All accessible data'
        }
      ],
      system: [
        {
          key: 'read_users',
          name: 'Read Users',
          description: 'View user profiles and information',
          scope: 'All users'
        },
        {
          key: 'manage_users',
          name: 'Manage Users',
          description: 'Edit user profiles and deactivate accounts',
          scope: 'All users except owners'
        },
        {
          key: 'create_workspaces',
          name: 'Create Workspaces',
          description: 'Create new workspaces',
          scope: 'System level'
        },
        {
          key: 'manage_workspaces',
          name: 'Manage Workspaces',
          description: 'Edit workspace settings and configurations',
          scope: 'All workspaces'
        },
        {
          key: 'system_admin',
          name: 'System Administration',
          description: 'Access system-wide settings and configurations',
          scope: 'System level'
        }
      ]
    };
    
    return permissions[type] || [];
  }

  hasPermission(permissionKey) {
    return this.currentPermissions.includes(permissionKey);
  }

  isPermissionInherited(permissionKey) {
    const role = this.user.role;
    if (!role || !this.rolePermissions[role]) return false;
    
    const permissions = this.workspaceId ? 
      this.rolePermissions[role].workspace : 
      this.rolePermissions[role].system;
    
    return permissions.includes(permissionKey);
  }

  attachEventListeners() {
    // Role selection
    const roleRadios = this.container.querySelectorAll('input[name="userRole"]');
    roleRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleRoleChange(e.target.value);
      });
    });

    // Permission toggles
    const permissionToggles = this.container.querySelectorAll('[data-permission]');
    permissionToggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        this.handlePermissionChange(e.target.dataset.permission, e.target.checked);
      });
    });

    // Tab switching
    const tabButtons = this.container.querySelectorAll('[data-tab]');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Advanced settings
    const overrideRole = this.container.querySelector('#overrideRole');
    overrideRole?.addEventListener('change', (e) => {
      this.user.overrideRole = e.target.checked;
    });

    const temporaryAccess = this.container.querySelector('#temporaryAccess');
    temporaryAccess?.addEventListener('change', (e) => {
      this.user.temporaryAccess = e.target.checked;
      this.render();
      this.attachEventListeners();
    });

    // Actions
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleAction(action);
      }
    });
  }

  handleRoleChange(newRole) {
    this.user.role = newRole;
    
    // Update role description
    const descriptionContainer = this.container.querySelector('#roleDescription');
    if (descriptionContainer) {
      descriptionContainer.textContent = this.getRoleDescription(newRole);
    }
    
    // Update selected role styling
    const roleCards = this.container.querySelectorAll('.role-card');
    roleCards.forEach(card => {
      card.classList.toggle('selected', card.querySelector(`input[value="${newRole}"]`).checked);
    });
    
    // Update permission toggles based on new role
    this.updatePermissionToggles();
  }

  handlePermissionChange(permissionKey, isGranted) {
    if (isGranted) {
      if (!this.currentPermissions.includes(permissionKey)) {
        this.currentPermissions.push(permissionKey);
      }
    } else {
      this.currentPermissions = this.currentPermissions.filter(p => p !== permissionKey);
    }
  }

  switchTab(tab) {
    // Update tab buttons
    const tabButtons = this.container.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update tab content
    const permissionLists = this.container.querySelectorAll('.permissions-list');
    permissionLists.forEach(list => {
      list.style.display = list.dataset.type === tab ? 'block' : 'none';
    });
  }

  updatePermissionToggles() {
    const role = this.user.role;
    if (!role || !this.rolePermissions[role]) return;
    
    const rolePermissions = this.workspaceId ? 
      this.rolePermissions[role].workspace : 
      this.rolePermissions[role].system;
    
    // Update toggles based on role
    const toggles = this.container.querySelectorAll('[data-permission]');
    toggles.forEach(toggle => {
      const permissionKey = toggle.dataset.permission;
      const isGrantedByRole = rolePermissions.includes(permissionKey);
      
      toggle.checked = isGrantedByRole;
      toggle.disabled = isGrantedByRole || !this.canEdit();
      
      // Update parent permission item styling
      const permissionItem = toggle.closest('.permission-item');
      permissionItem.classList.toggle('inherited', isGrantedByRole);
    });
  }

  async handleAction(action) {
    switch (action) {
      case 'save':
        await this.savePermissions();
        break;
      case 'reset':
        this.resetToRoleDefaults();
        break;
    }
  }

  async savePermissions() {
    try {
      const permissions = {
        permissions: this.currentPermissions,
        role: this.user.role,
        overrideRole: this.user.overrideRole,
        temporaryAccess: this.user.temporaryAccess,
        expirationDate: this.user.expirationDate
      };

      if (this.workspaceId) {
        await userManagementService.updateUserRole(this.workspaceId, this.userId, this.user.role);
      } else {
        await userManagementService.updateUserProfile(this.userId, permissions);
      }

      this.emit('permissionsUpdated', {
        userId: this.userId,
        permissions: this.currentPermissions,
        role: this.user.role
      });

      this.showSuccess('Permissions updated successfully');
    } catch (error) {
      console.error('Error saving permissions:', error);
      this.showError('Failed to update permissions');
    }
  }

  resetToRoleDefaults() {
    const role = this.user.role;
    if (!role || !this.rolePermissions[role]) return;
    
    const defaultPermissions = this.workspaceId ? 
      this.rolePermissions[role].workspace : 
      this.rolePermissions[role].system;
    
    this.currentPermissions = [...defaultPermissions];
    this.updatePermissionToggles();
    
    this.showSuccess('Permissions reset to role defaults');
  }

  canEdit() {
    // Check if current user has permission to edit
    const currentUser = userManagementService.getCurrentUser();
    if (!currentUser) return false;
    
    if (currentUser.role === 'owner') return true;
    if (currentUser.role === 'admin' && this.user.role !== 'owner') return true;
    
    return currentUser.id === this.userId;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  showSuccess(message) {
    // Implementation for success message
    console.log('Success:', message);
  }

  showError(message) {
    // Implementation for error message
    console.error('Error:', message);
  }

  async refresh() {
    await this.loadUser();
    this.updatePermissionToggles();
  }

  destroy() {
    this.container.innerHTML = '';
    this.removeAllListeners();
  }
}