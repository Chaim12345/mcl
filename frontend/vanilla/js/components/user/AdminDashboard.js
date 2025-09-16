/**
 * Admin Dashboard Component
 * Comprehensive system administration interface for user management
 */

import { userManagementService } from '../../services/userManagement.js';
import { UserList } from './UserList.js';
import { UserActivity } from './UserActivity.js';
import { EventEmitter } from '../../utils/eventEmitter.js';

export class AdminDashboard extends EventEmitter {
  constructor(container, options = {}) {
    super();
    this.container = container;
    this.options = {
      showSystemStats: true,
      showUserList: true,
      showActivity: true,
      showBulkOperations: true,
      ...options
    };
    
    this.users = [];
    this.stats = {};
    this.currentView = 'overview';
    
    this.init();
  }

  async init() {
    this.render();
    await this.loadData();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="admin-dashboard">
        ${this.renderHeader()}
        ${this.renderNavigation()}
        ${this.renderContent()}
      </div>
    `;
  }

  renderHeader() {
    return `
      <div class="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>System-wide user management and administration</p>
      </div>
    `;
  }

  renderNavigation() {
    return `
      <div class="dashboard-nav">
        <button class="nav-btn ${this.currentView === 'overview' ? 'active' : ''}" 
                data-view="overview">
          Overview
        </button>
        <button class="nav-btn ${this.currentView === 'users' ? 'active' : ''}" 
                data-view="users">
          All Users
        </button>
        <button class="nav-btn ${this.currentView === 'activity' ? 'active' : ''}" 
                data-view="activity">
          System Activity
        </button>
        <button class="nav-btn ${this.currentView === 'settings' ? 'active' : ''}" 
                data-view="settings">
          System Settings
        </button>
      </div>
    `;
  }

  renderContent() {
    switch (this.currentView) {
      case 'overview':
        return this.renderOverview();
      case 'users':
        return this.renderUsersView();
      case 'activity':
        return this.renderActivityView();
      case 'settings':
        return this.renderSettingsView();
      default:
        return this.renderOverview();
    }
  }

  renderOverview() {
    return `
      <div class="overview-view">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${this.stats.totalUsers || 0}</div>
            <div class="stat-label">Total Users</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${this.stats.activeUsers || 0}</div>
            <div class="stat-label">Active Users</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${this.stats.newUsers || 0}</div>
            <div class="stat-label">New This Month</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${this.stats.totalWorkspaces || 0}</div>
            <div class="stat-label">Workspaces</div>
          </div>
        </div>
        
        <div class="dashboard-grid">
          <div class="dashboard-section">
            <h3>Recent Activity</h3>
            <div id="recentActivity">
              ${this.renderRecentActivity()}
            </div>
          </div>
          
          <div class="dashboard-section">
            <h3>System Health</h3>
            <div class="health-indicators">
              ${this.renderHealthIndicators()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderUsersView() {
    return `
      <div class="users-view">
        <div class="users-header">
          <h2>All Users</h2>
          <div class="user-actions">
            <button class="btn btn-outline" data-action="export-users">Export Users</button>
            <button class="btn btn-primary" data-action="add-user">Add User</button>
          </div>
        </div>
        <div id="usersList">
          <!-- UserList component will be mounted here -->
        </div>
      </div>
    `;
  }

  renderActivityView() {
    return `
      <div class="activity-view">
        <h2>System Activity</h2>
        <div id="systemActivity">
          <!-- UserActivity component for all users -->
        </div>
      </div>
    `;
  }

  renderSettingsView() {
    return `
      <div class="settings-view">
        <h2>System Settings</h2>
        <div class="settings-grid">
          <div class="settings-section">
            <h3>User Management</h3>
            <label>
              <input type="checkbox" id="enableRegistration" ${this.getSystemSetting('enableRegistration') ? 'checked' : ''}>
              Allow new user registration
            </label>
          </div>
          
          <div class="settings-section">
            <h3>Security Settings</h3>
            <label>
              <input type="checkbox" id="requireEmailVerification" ${this.getSystemSetting('requireEmailVerification') ? 'checked' : ''}>
              Require email verification
            </label>
          </div>
        </div>
      </div>
    `;
  }

  renderRecentActivity() {
    const activities = this.stats.recentActivity || [];
    
    return activities.map(activity => `
      <div class="activity-item">
        <div class="activity-user">${activity.userName}</div>
        <div class="activity-action">${activity.action}</div>
        <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
      </div>
    `).join('');
  }

  renderHealthIndicators() {
    return `
      <div class="health-grid">
        <div class="health-item">
          <span class="health-label">API Response Time</span>
          <span class="health-value good">120ms</span>
        </div>
        <div class="health-item">
          <span class="health-label">Database Status</span>
          <span class="health-value good">Healthy</span>
        </div>
        <div class="health-item">
          <span class="health-label">WebSocket Connections</span>
          <span class="health-value">${this.stats.activeConnections || 0}</span>
        </div>
      </div>
    `;
  }

  async loadData() {
    try {
      await Promise.all([
        this.loadSystemStats(),
        this.loadUsers()
      ]);
      this.mountComponents();
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  }

  async loadSystemStats() {
    try {
      // This would fetch system statistics from the server
      this.stats = {
        totalUsers: 1250,
        activeUsers: 890,
        newUsers: 45,
        totalWorkspaces: 340,
        activeConnections: 156,
        recentActivity: [
          { userName: 'John Doe', action: 'Created new board', timestamp: Date.now() - 300000 },
          { userName: 'Jane Smith', action: 'Invited user to workspace', timestamp: Date.now() - 600000 }
        ]
      };
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  }

  async loadUsers() {
    try {
      const data = await userManagementService.getAllUsers({ limit: 100 });
      this.users = data.users || data;
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  mountComponents() {
    // Mount UserList for system-wide users
    const usersList = this.container.querySelector('#usersList');
    if (usersList) {
      new UserList(usersList, {
        mode: 'system',
        showRoles: true,
        showActions: true,
        enableBulk: true
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
    
    // Action buttons
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleAction(action);
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
    
    // Update content
    this.renderContent();
    this.mountComponents();
  }

  handleAction(action) {
    switch (action) {
      case 'export-users':
        this.exportUsers();
        break;
      case 'add-user':
        this.showAddUserModal();
        break;
    }
  }

  async exportUsers() {
    try {
      const data = await userManagementService.getAllUsers({ limit: 1000 });
      
      const csv = this.convertToCSV(data.users || data);
      this.downloadFile(csv, 'users-export.csv', 'text/csv');
    } catch (error) {
      console.error('Error exporting users:', error);
    }
  }

  convertToCSV(users) {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Created At'];
    const rows = users.map(user => [
      user.id,
      user.name,
      user.email,
      user.role || 'member',
      user.status || 'active',
      new Date(user.createdAt).toISOString()
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  showAddUserModal() {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-content">
          <h3>Add New User</h3>
          <form id="addUserForm">
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="newUserEmail" required>
            </div>
            <div class="form-group">
              <label>Name</label>
              <input type="text" id="newUserName" required>
            </div>
            <div class="form-group">
              <label>Role</label>
              <select id="newUserRole">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">Create User</button>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = modal.querySelector('#addUserForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Handle user creation
      modal.remove();
    });
  }

  getSystemSetting(key) {
    // Return system setting value
    return true; // Default enabled
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  async refresh() {
    await this.loadData();
  }

  destroy() {
    this.container.innerHTML = '';
    this.removeAllListeners();
  }
}