/**
 * User List Component
 * Displays users with search, filtering, and bulk operations
 */

import { userManagementService } from '../../services/userManagement.js';
import { EventEmitter } from '../../utils/eventEmitter.js';
import { debounce } from '../../utils/debounce.js';

export class UserList extends EventEmitter {
  constructor(container, options = {}) {
    super();
    this.container = container;
    this.options = {
      mode: 'workspace', // 'workspace' or 'system'
      workspaceId: null,
      showRoles: true,
      showActions: true,
      enableBulk: true,
      enableSearch: true,
      enableFilters: true,
      ...options
    };
    
    this.users = [];
    this.filteredUsers = [];
    this.selectedUsers = new Set();
    this.currentPage = 1;
    this.totalPages = 1;
    this.searchQuery = '';
    this.filters = {
      role: '',
      status: '',
      joinedAfter: '',
      joinedBefore: ''
    };
    
    this.init();
  }

  async init() {
    this.render();
    this.attachEventListeners();
    await this.loadUsers();
  }

  render() {
    this.container.innerHTML = `
      <div class="user-list-container">
        ${this.renderHeader()}
        ${this.renderToolbar()}
        ${this.renderUserTable()}
        ${this.renderPagination()}
      </div>
    `;
  }

  renderHeader() {
    return `
      <div class="user-list-header">
        <h2>${this.options.mode === 'workspace' ? 'Workspace Members' : 'All Users'}</h2>
        <button class="btn btn-primary invite-user-btn" data-action="invite">
          <i class="icon-plus"></i> Invite User
        </button>
      </div>
    `;
  }

  renderToolbar() {
    return `
      <div class="user-list-toolbar">
        ${this.options.enableSearch ? `
          <div class="search-container">
            <input type="text" 
                   class="form-control search-input" 
                   placeholder="Search users..."
                   value="${this.searchQuery}">
            <i class="icon-search"></i>
          </div>
        ` : ''}
        
        ${this.options.enableFilters ? `
          <div class="filter-container">
            <select class="form-control filter-select" data-filter="role">
              <option value="">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            
            <select class="form-control filter-select" data-filter="status">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <input type="date" 
                   class="form-control date-input" 
                   data-filter="joinedAfter"
                   placeholder="Joined after">
            
            <input type="date" 
                   class="form-control date-input" 
                   data-filter="joinedBefore"
                   placeholder="Joined before">
          </div>
        ` : ''}
        
        ${this.options.enableBulk ? `
          <div class="bulk-actions-container">
            <button class="btn btn-secondary" id="selectAllBtn">Select All</button>
            <button class="btn btn-danger" id="removeSelectedBtn" disabled>
              Remove Selected
            </button>
            <button class="btn btn-primary" id="changeRoleBtn" disabled>
              Change Role
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderUserTable() {
    if (this.filteredUsers.length === 0) {
      return `
        <div class="empty-state">
          <i class="icon-users"></i>
          <h3>No users found</h3>
          <p>${this.searchQuery ? 'Try adjusting your search criteria.' : 'No users in this workspace.'}</p>
        </div>
      `;
    }

    return `
      <div class="user-table-container">
        <table class="user-table">
          <thead>
            <tr>
              ${this.options.enableBulk ? '<th><input type="checkbox" id="selectAllCheckbox"></th>' : ''}
              <th>User</th>
              <th>Email</th>
              ${this.options.showRoles ? '<th>Role</th>' : ''}
              <th>Status</th>
              <th>Joined</th>
              <th>Last Active</th>
              ${this.options.showActions ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${this.filteredUsers.map(user => this.renderUserRow(user)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderUserRow(user) {
    const roleBadge = this.getRoleBadge(user.role);
    const statusBadge = this.getStatusBadge(user.status);
    
    return `
      <tr data-user-id="${user.id}">
        ${this.options.enableBulk ? `
          <td><input type="checkbox" class="user-checkbox" data-user-id="${user.id}"></td>
        ` : ''}
        <td>
          <div class="user-info">
            <img src="${user.avatarUrl || '/assets/default-avatar.png'}" 
                 alt="${user.name}" 
                 class="user-avatar">
            <div>
              <div class="user-name">${user.name}</div>
              <div class="user-username">@${user.username}</div>
            </div>
          </div>
        </td>
        <td>${user.email}</td>
        ${this.options.showRoles ? `<td><span class="badge ${roleBadge.class}">${roleBadge.label}</span></td>` : ''}
        <td><span class="badge ${statusBadge.class}">${statusBadge.label}</span></td>
        <td>${this.formatDate(user.createdAt)}</td>
        <td>${this.formatLastActive(user.lastActiveAt)}</td>
        ${this.options.showActions ? `
          <td>
            <div class="user-actions">
              <button class="btn btn-sm btn-outline" data-action="view" data-user-id="${user.id}">
                <i class="icon-eye"></i>
              </button>
              <button class="btn btn-sm btn-outline" data-action="edit" data-user-id="${user.id}">
                <i class="icon-edit"></i>
              </button>
              <button class="btn btn-sm btn-outline btn-danger" data-action="remove" data-user-id="${user.id}">
                <i class="icon-trash"></i>
              </button>
            </div>
          </td>
        ` : ''}
      </tr>
    `;
  }

  renderPagination() {
    if (this.totalPages <= 1) return '';

    return `
      <div class="pagination-container">
        <button class="btn btn-outline" id="prevPage" ${this.currentPage === 1 ? 'disabled' : ''}>
          Previous
        </button>
        <span class="page-info">
          Page ${this.currentPage} of ${this.totalPages}
        </span>
        <button class="btn btn-outline" id="nextPage" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
          Next
        </button>
      </div>
    `;
  }

  getRoleBadge(role) {
    const badges = {
      owner: { label: 'Owner', class: 'badge-danger' },
      admin: { label: 'Admin', class: 'badge-warning' },
      member: { label: 'Member', class: 'badge-primary' },
      viewer: { label: 'Viewer', class: 'badge-secondary' },
      pending: { label: 'Pending', class: 'badge-light' }
    };
    return badges[role] || { label: role, class: 'badge-secondary' };
  }

  getStatusBadge(status) {
    const badges = {
      active: { label: 'Active', class: 'badge-success' },
      pending: { label: 'Pending', class: 'badge-warning' },
      inactive: { label: 'Inactive', class: 'badge-secondary' }
    };
    return badges[status] || { label: status, class: 'badge-secondary' };
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }

  formatLastActive(lastActive) {
    if (!lastActive) return 'Never';
    
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffMs = now - lastActiveDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    
    return lastActiveDate.toLocaleDateString();
  }

  attachEventListeners() {
    // Search functionality
    if (this.options.enableSearch) {
      const searchInput = this.container.querySelector('.search-input');
      searchInput?.addEventListener('input', debounce((e) => {
        this.searchQuery = e.target.value;
        this.filterUsers();
      }, 300));
    }

    // Filter functionality
    if (this.options.enableFilters) {
      const filterSelects = this.container.querySelectorAll('.filter-select');
      filterSelects.forEach(select => {
        select.addEventListener('change', (e) => {
          const filterType = e.target.dataset.filter;
          this.filters[filterType] = e.target.value;
          this.filterUsers();
        });
      });

      const dateInputs = this.container.querySelectorAll('.date-input');
      dateInputs.forEach(input => {
        input.addEventListener('change', (e) => {
          const filterType = e.target.dataset.filter;
          this.filters[filterType] = e.target.value;
          this.filterUsers();
        });
      });
    }

    // Bulk operations
    if (this.options.enableBulk) {
      const selectAllCheckbox = this.container.querySelector('#selectAllCheckbox');
      selectAllCheckbox?.addEventListener('change', (e) => {
        this.toggleSelectAll(e.target.checked);
      });

      const selectAllBtn = this.container.querySelector('#selectAllBtn');
      selectAllBtn?.addEventListener('click', () => {
        this.selectAllUsers();
      });

      const removeSelectedBtn = this.container.querySelector('#removeSelectedBtn');
      removeSelectedBtn?.addEventListener('click', () => {
        this.removeSelectedUsers();
      });

      const changeRoleBtn = this.container.querySelector('#changeRoleBtn');
      changeRoleBtn?.addEventListener('click', () => {
        this.changeSelectedUsersRole();
      });
    }

    // Action buttons
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
      const userId = e.target.dataset.userId || e.target.closest('[data-user-id]')?.dataset.userId;

      if (action && userId) {
        this.handleUserAction(action, userId);
      }
    });

    // Pagination
    const prevPageBtn = this.container.querySelector('#prevPage');
    prevPageBtn?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadUsers();
      }
    });

    const nextPageBtn = this.container.querySelector('#nextPage');
    nextPageBtn?.addEventListener('click', () => {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.loadUsers();
      }
    });
  }

  async loadUsers() {
    try {
      this.showLoading();
      
      let data;
      if (this.options.mode === 'workspace' && this.options.workspaceId) {
        data = await userManagementService.getWorkspaceUsers(this.options.workspaceId);
      } else {
        data = await userManagementService.getAllUsers({
          page: this.currentPage,
          search: this.searchQuery,
          ...this.filters
        });
      }

      this.users = Array.isArray(data) ? data : data.users || [];
      this.totalPages = data.totalPages || 1;
      this.filterUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      this.showError('Failed to load users');
    }
  }

  filterUsers() {
    let filtered = [...this.users];

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (this.filters.role) {
      filtered = filtered.filter(user => user.role === this.filters.role);
    }

    // Apply status filter
    if (this.filters.status) {
      filtered = filtered.filter(user => user.status === this.filters.status);
    }

    // Apply date filters
    if (this.filters.joinedAfter) {
      const afterDate = new Date(this.filters.joinedAfter);
      filtered = filtered.filter(user => new Date(user.createdAt) >= afterDate);
    }

    if (this.filters.joinedBefore) {
      const beforeDate = new Date(this.filters.joinedBefore);
      filtered = filtered.filter(user => new Date(user.createdAt) <= beforeDate);
    }

    this.filteredUsers = filtered;
    this.selectedUsers.clear();
    this.updateBulkActions();
    this.render();
  }

  toggleSelectAll(checked) {
    const checkboxes = this.container.querySelectorAll('.user-checkbox');
    checkboxes.forEach(checkbox => {
      const userId = checkbox.dataset.userId;
      if (checked) {
        this.selectedUsers.add(userId);
        checkbox.checked = true;
      } else {
        this.selectedUsers.delete(userId);
        checkbox.checked = false;
      }
    });
    this.updateBulkActions();
  }

  selectAllUsers() {
    this.filteredUsers.forEach(user => this.selectedUsers.add(user.id));
    this.updateBulkActions();
    this.render();
  }

  updateBulkActions() {
    const removeBtn = this.container.querySelector('#removeSelectedBtn');
    const changeRoleBtn = this.container.querySelector('#changeRoleBtn');
    
    if (removeBtn && changeRoleBtn) {
      const hasSelection = this.selectedUsers.size > 0;
      removeBtn.disabled = !hasSelection;
      changeRoleBtn.disabled = !hasSelection;
    }
  }

  handleUserAction(action, userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    switch (action) {
      case 'view':
        this.emit('viewUser', user);
        break;
      case 'edit':
        this.emit('editUser', user);
        break;
      case 'remove':
        this.removeUser(user);
        break;
      case 'invite':
        this.emit('inviteUser');
        break;
    }
  }

  async removeSelectedUsers() {
    if (this.selectedUsers.size === 0) return;

    const confirmed = confirm(`Are you sure you want to remove ${this.selectedUsers.size} users?`);
    if (!confirmed) return;

    try {
      const userIds = Array.from(this.selectedUsers);
      
      if (this.options.mode === 'workspace' && this.options.workspaceId) {
        await Promise.all(
          userIds.map(userId => 
            userManagementService.removeUserFromWorkspace(this.options.workspaceId, userId)
          )
        );
      } else {
        await userManagementService.bulkUserOperation('delete', userIds);
      }

      this.selectedUsers.clear();
      await this.loadUsers();
      this.emit('usersRemoved', userIds);
    } catch (error) {
      console.error('Error removing users:', error);
      this.showError('Failed to remove users');
    }
  }

  async changeSelectedUsersRole() {
    if (this.selectedUsers.size === 0) return;

    const newRole = prompt('Enter new role (owner, admin, member, viewer):');
    if (!newRole || !['owner', 'admin', 'member', 'viewer'].includes(newRole)) return;

    try {
      const userIds = Array.from(this.selectedUsers);
      
      if (this.options.mode === 'workspace' && this.options.workspaceId) {
        await Promise.all(
          userIds.map(userId => 
            userManagementService.updateUserRole(this.options.workspaceId, userId, newRole)
          )
        );
      }

      this.selectedUsers.clear();
      await this.loadUsers();
      this.emit('usersRoleChanged', { userIds, newRole });
    } catch (error) {
      console.error('Error changing user roles:', error);
      this.showError('Failed to change user roles');
    }
  }

  async removeUser(user) {
    const confirmed = confirm(`Are you sure you want to remove ${user.name}?`);
    if (!confirmed) return;

    try {
      if (this.options.mode === 'workspace' && this.options.workspaceId) {
        await userManagementService.removeUserFromWorkspace(this.options.workspaceId, user.id);
      } else {
        await userManagementService.updateUserProfile(user.id, { status: 'inactive' });
      }

      await this.loadUsers();
      this.emit('userRemoved', user);
    } catch (error) {
      console.error('Error removing user:', error);
      this.showError('Failed to remove user');
    }
  }

  showLoading() {
    const tableContainer = this.container.querySelector('.user-table-container');
    if (tableContainer) {
      tableContainer.innerHTML = '<div class="loading-spinner">Loading users...</div>';
    }
  }

  showError(message) {
    const tableContainer = this.container.querySelector('.user-table-container');
    if (tableContainer) {
      tableContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }

  async refresh() {
    await this.loadUsers();
  }

  destroy() {
    this.users = [];
    this.filteredUsers = [];
    this.selectedUsers.clear();
    this.container.innerHTML = '';
    this.removeAllListeners();
  }
}