/**
 * Workspace Member Management Interface
 * Comprehensive interface for managing workspace members, roles, and permissions
 */

import { userManagementService } from '../../services/userManagement.js';
import { UserList } from './UserList.js';
import { UserInvite } from './UserInvite.js';
import { UserPermissions } from './UserPermissions.js';
import { EventEmitter } from '../../utils/eventEmitter.js';

export class WorkspaceMemberManager extends EventEmitter {
  constructor(container, workspaceId, options = {}) {
    super();
    this.container = container;
    this.workspaceId = workspaceId;
    this.options = {
      showInvitations: true,
      showBulkOperations: true,
      showActivity: true,
      showPermissions: true,
      ...options
    };
    
    this.members = [];
    this.invitations = [];
    this.currentView = 'list';
    this.selectedMember = null;
    
    this.init();
  }

  async init() {
    this.render();
    await this.loadData();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="workspace-member-manager">
        ${this.renderHeader()}
        ${this.renderNavigation()}
        ${this.renderContent()}
        ${this.renderBulkActions()}
      </div>
    `;
  }

  renderHeader() {
    return `
      <div class="member-manager-header">
        <h1>Workspace Members</h1>
        <p>Manage members, roles, and permissions for this workspace</p>
      </div>
    `;
  }

  renderNavigation() {
    return `
      <div class="member-nav">
        <button class="nav-btn ${this.currentView === 'list' ? 'active' : ''}" data-view="list">
          <i class="icon-users"></i> Members List
        </button>
        <button class="nav-btn ${this.currentView === 'invite' ? 'active' : ''}" data-view="invite">
          <i class="icon-user-plus"></i> Invite Members
        </button>
      </div>
    `;
  }

  renderContent() {
    switch (this.currentView) {
      case 'list':
        return `
          <div class="list-view active">
            <div id="membersList" class="members-container"></div>
          </div>
        `;
      case 'invite':
        return `
          <div class="invite-view active">
            <div id="userInviteComponent"></div>
            <div id="pendingInvitations">${this.renderPendingInvitations()}</div>
          </div>
        `;
      default:
        return `<div class="list-view active"><div id="membersList" class="members-container"></div></div>`;
    }
  }

  renderPendingInvitations() {
    return this.invitations
      .filter(invite => invite.status === 'pending')
      .map(invite => `
        <div class="invitation-item">
          <div class="invitation-info">
            <div class="invitation-email">${invite.email}</div>
            <div class="invitation-details">
              Invited ${this.formatDate(invite.createdAt)} • Role: ${invite.role}
            </div>
          </div>
          <div class="invitation-actions">
            <button class="btn btn-sm btn-outline" data-action="resend-invite" data-invite-id="${invite.id}">
              Resend
            </button>
            <button class="btn btn-sm btn-outline btn-danger" data-action="cancel-invite" data-invite-id="${invite.id}">
              Cancel
            </button>
          </div>
        </div>
      `).join('');
  }

  renderBulkActions() {
    if (!this.options.showBulkOperations) return '';
    
    return `
      <div class="bulk-actions-panel">
        <div class="bulk-actions-content">
          <h4>Bulk Actions</h4>
          <div class="bulk-actions-list">
            <button class="btn btn-outline" data-action="bulk-change-role">
              Change Role
            </button>
            <button class="btn btn-outline" data-action="bulk-remove">
              Remove Members
            </button>
            <button class="btn btn-outline" data-action="bulk-export">
              Export Member List
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async loadData() {
    try {
      await Promise.all([
        this.loadMembers(),
        this.loadInvitations()
      ]);
      
      this.mountComponents();
    } catch (error) {
      console.error('Error loading workspace data:', error);
    }
  }

  async loadMembers() {
    try {
      const members = await userManagementService.getWorkspaceUsers(this.workspaceId);
      this.members = members;
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }

  async loadInvitations() {
    try {
      const invitations = await userManagementService.getWorkspaceInvitations(this.workspaceId);
      this.invitations = invitations;
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  }

  mountComponents() {
    // Mount UserList component
    const membersList = this.container.querySelector('#membersList');
    if (membersList) {
      this.userList = new UserList(membersList, {
        mode: 'workspace',
        workspaceId: this.workspaceId,
        showRoles: true,
        showActions: true
      });
      
      this.userList.on('editUser', (user) => {
        this.selectedMember = user;
        this.emit('editMember', user);
      });
    }
    
    // Mount UserInvite component
    const inviteContainer = this.container.querySelector('#userInviteComponent');
    if (inviteContainer) {
      this.userInvite = new UserInvite(inviteContainer, this.workspaceId, {
        showTemplates: true,
        customMessage: true
      });
      
      this.userInvite.on('invitationsSent', (invitations) => {
        this.emit('membersInvited', invitations);
        this.refreshInvitations();
      });
    }
  }

  attachEventListeners() {
    // Navigation
    this.container.addEventListener('click', (e) => {
      if (e.target.matches('[data-view]')) {
        this.switchView(e.target.dataset.view);
      }
    });
    
    // Invitation actions
    this.container.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="resend-invite"]')) {
        this.resendInvitation(e.target.dataset.inviteId);
      } else if (e.target.matches('[data-action="cancel-invite"]')) {
        this.cancelInvitation(e.target.dataset.inviteId);
      } else if (e.target.matches('[data-action="bulk-change-role"]')) {
        this.handleBulkAction('change-role');
      } else if (e.target.matches('[data-action="bulk-remove"]')) {
        this.handleBulkAction('remove');
      } else if (e.target.matches('[data-action="bulk-export"]')) {
        this.handleBulkAction('export');
      }
    });
  }

  switchView(view) {
    this.currentView = view;
    
    // Update navigation
    const navButtons = this.container.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Re-render content
    this.renderContent();
    this.mountComponents();
  }

  async resendInvitation(invitationId) {
    try {
      await userManagementService.cancelInvitation(this.workspaceId, invitationId);
      this.refreshInvitations();
    } catch (error) {
      console.error('Error resending invitation:', error);
    }
  }

  async cancelInvitation(invitationId) {
    try {
      await userManagementService.cancelInvitation(this.workspaceId, invitationId);
      this.refreshInvitations();
    } catch (error) {
      console.error('Error canceling invitation:', error);
    }
  }

  async refreshInvitations() {
    await this.loadInvitations();
    const pendingContainer = this.container.querySelector('#pendingInvitations');
    if (pendingContainer) {
      pendingContainer.innerHTML = this.renderPendingInvitations();
    }
  }

  async handleBulkAction(action) {
    // Implement bulk actions
    console.log('Bulk action:', action);
  }

  getPendingInvitationsCount() {
    return this.invitations.filter(invite => invite.status === 'pending').length;
  }

  getActiveMembersCount() {
    return this.members.filter(member => member.status === 'active').length;
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }

  async refresh() {
    await this.loadData();
    if (this.userList) {
      await this.userList.refresh();
    }
  }

  destroy() {
    if (this.userList) {
      this.userList.destroy();
    }
    if (this.userInvite) {
      this.userInvite.destroy();
    }
    this.container.innerHTML = '';
    this.removeAllListeners();
  }
}