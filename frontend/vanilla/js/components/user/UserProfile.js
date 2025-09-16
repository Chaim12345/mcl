/**
 * User Profile Component
 * Displays and allows editing of user details, preferences, and settings
 */

import { userManagementService } from '../../services/userManagement.js';
import { EventEmitter } from '../../utils/eventEmitter.js';

export class UserProfile extends EventEmitter {
  constructor(container, user = null, options = {}) {
    super();
    this.container = container;
    this.user = user;
    this.options = {
      mode: 'edit', // 'view', 'edit', 'admin'
      showPreferences: true,
      showSecurity: true,
      showActivity: true,
      showPermissions: false,
      ...options
    };
    
    this.originalUser = null;
    this.isEditing = false;
    this.activeTab = 'profile';
    
    this.init();
  }

  async init() {
    if (!this.user) {
      this.user = userManagementService.getCurrentUser();
    }
    
    if (this.user && !this.user.email) {
      await this.loadUserDetails();
    }
    
    this.render();
    this.attachEventListeners();
  }

  async loadUserDetails() {
    try {
      this.user = await userManagementService.getUserById(this.user.id);
      this.originalUser = { ...this.user };
    } catch (error) {
      console.error('Error loading user details:', error);
      this.showError('Failed to load user details');
    }
  }

  render() {
    if (!this.user) {
      this.container.innerHTML = '<div class="error">User not found</div>';
      return;
    }

    this.container.innerHTML = `
      <div class="user-profile-container">
        ${this.renderHeader()}
        <div class="profile-content">
          ${this.renderTabs()}
          <div class="tab-content">
            ${this.renderActiveTab()}
          </div>
        </div>
      </div>
    `;
  }

  renderHeader() {
    return `
      <div class="profile-header">
        <div class="user-info-header">
          <div class="avatar-container">
            <img src="${this.user.avatarUrl || '/assets/default-avatar.png'}" 
                 alt="${this.user.name}" 
                 class="user-avatar-large">
            ${this.canEdit() ? `
              <button class="avatar-edit-btn" data-action="change-avatar">
                <i class="icon-camera"></i>
              </button>
            ` : ''}
          </div>
          <div class="user-details">
            <h1>${this.user.name}</h1>
            <p class="username">@${this.user.username}</p>
            <p class="email">${this.user.email}</p>
            <div class="user-badges">
              <span class="badge badge-${this.user.role || 'member'}">${this.user.role || 'member'}</span>
              <span class="badge badge-${this.user.status || 'active'}">${this.user.status || 'active'}</span>
            </div>
          </div>
          ${this.canEdit() ? `
            <div class="profile-actions">
              ${this.isEditing ? `
                <button class="btn btn-primary" data-action="save">Save Changes</button>
                <button class="btn btn-secondary" data-action="cancel">Cancel</button>
              ` : `
                <button class="btn btn-primary" data-action="edit">Edit Profile</button>
              `}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderTabs() {
    const tabs = ['profile'];
    
    if (this.options.showPreferences) tabs.push('preferences');
    if (this.options.showSecurity) tabs.push('security');
    if (this.options.showActivity) tabs.push('activity');
    if (this.options.showPermissions) tabs.push('permissions');

    return `
      <div class="profile-tabs">
        ${tabs.map(tab => `
          <button class="tab-btn ${this.activeTab === tab ? 'active' : ''}" 
                  data-tab="${tab}">
            ${tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        `).join('')}
      </div>
    `;
  }

  renderActiveTab() {
    switch (this.activeTab) {
      case 'profile':
        return this.renderProfileTab();
      case 'preferences':
        return this.renderPreferencesTab();
      case 'security':
        return this.renderSecurityTab();
      case 'activity':
        return this.renderActivityTab();
      case 'permissions':
        return this.renderPermissionsTab();
      default:
        return this.renderProfileTab();
    }
  }

  renderProfileTab() {
    return `
      <div class="profile-tab">
        <h3>Profile Information</h3>
        <form class="profile-form">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" 
                   class="form-control" 
                   name="name" 
                   value="${this.user.name || ''}"
                   ${!this.isEditing ? 'readonly' : ''}>
          </div>
          
          <div class="form-group">
            <label>Username</label>
            <input type="text" 
                   class="form-control" 
                   name="username" 
                   value="${this.user.username || ''}"
                   ${!this.isEditing ? 'readonly' : ''}>
          </div>
          
          <div class="form-group">
            <label>Email</label>
            <input type="email" 
                   class="form-control" 
                   name="email" 
                   value="${this.user.email || ''}"
                   ${!this.isEditing ? 'readonly' : ''}>
          </div>
          
          <div class="form-group">
            <label>Bio</label>
            <textarea class="form-control" 
                      name="bio" 
                      rows="4"
                      ${!this.isEditing ? 'readonly' : ''}>${this.user.bio || ''}</textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Phone</label>
              <input type="tel" 
                     class="form-control" 
                     name="phone" 
                     value="${this.user.phone || ''}"
                     ${!this.isEditing ? 'readonly' : ''}>
            </div>
            
            <div class="form-group">
              <label>Location</label>
              <input type="text" 
                     class="form-control" 
                     name="location" 
                     value="${this.user.location || ''}"
                     ${!this.isEditing ? 'readonly' : ''}>
            </div>
          </div>
          
          <div class="form-group">
            <label>Website</label>
            <input type="url" 
                   class="form-control" 
                   name="website" 
                   value="${this.user.website || ''}"
                   ${!this.isEditing ? 'readonly' : ''}>
          </div>
        </form>
      </div>
    `;
  }

  renderPreferencesTab() {
    return `
      <div class="preferences-tab">
        <h3>Preferences</h3>
        
        <div class="preference-section">
          <h4>Notifications</h4>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" name="emailNotifications" ${this.user.preferences?.emailNotifications ? 'checked' : ''}>
              Email notifications
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" name="pushNotifications" ${this.user.preferences?.pushNotifications ? 'checked' : ''}>
              Push notifications
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" name="activityEmails" ${this.user.preferences?.activityEmails ? 'checked' : ''}>
              Activity summary emails
            </label>
          </div>
        </div>
        
        <div class="preference-section">
          <h4>Display</h4>
          <div class="form-group">
            <label>Theme</label>
            <select class="form-control" name="theme">
              <option value="auto" ${this.user.preferences?.theme === 'auto' ? 'selected' : ''}>Auto</option>
              <option value="light" ${this.user.preferences?.theme === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${this.user.preferences?.theme === 'dark' ? 'selected' : ''}>Dark</option>
            </select>
          </div>
          <div class="form-group">
            <label>Language</label>
            <select class="form-control" name="language">
              <option value="en" ${this.user.preferences?.language === 'en' ? 'selected' : ''}>English</option>
              <option value="es" ${this.user.preferences?.language === 'es' ? 'selected' : ''}>Spanish</option>
              <option value="fr" ${this.user.preferences?.language === 'fr' ? 'selected' : ''}>French</option>
            </select>
          </div>
        </div>
        
        <div class="preference-section">
          <h4>Privacy</h4>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" name="profileVisibility" ${this.user.preferences?.profileVisibility === 'public' ? 'checked' : ''}>
              Public profile
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" name="showEmail" ${this.user.preferences?.showEmail ? 'checked' : ''}>
              Show email on profile
            </label>
          </div>
        </div>
      </div>
    `;
  }

  renderSecurityTab() {
    return `
      <div class="security-tab">
        <h3>Security Settings</h3>
        
        <div class="security-section">
          <h4>Change Password</h4>
          <form class="password-form">
            <div class="form-group">
              <label>Current Password</label>
              <input type="password" class="form-control" name="currentPassword">
            </div>
            <div class="form-group">
              <label>New Password</label>
              <input type="password" class="form-control" name="newPassword">
            </div>
            <div class="form-group">
              <label>Confirm New Password</label>
              <input type="password" class="form-control" name="confirmPassword">
            </div>
            <button type="button" class="btn btn-primary" data-action="change-password">
              Change Password
            </button>
          </form>
        </div>
        
        <div class="security-section">
          <h4>Two-Factor Authentication</h4>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" name="twoFactorEnabled" ${this.user.security?.twoFactorEnabled ? 'checked' : ''}>
              Enable two-factor authentication
            </label>
          </div>
          ${this.user.security?.twoFactorEnabled ? `
            <button class="btn btn-outline" data-action="configure-2fa">Configure 2FA</button>
          ` : ''}
        </div>
        
        <div class="security-section">
          <h4>Connected Accounts</h4>
          <div class="connected-accounts">
            ${this.renderConnectedAccounts()}
          </div>
        </div>
      </div>
    `;
  }

  renderConnectedAccounts() {
    const connected = this.user.connectedAccounts || {};
    
    return `
      <div class="account-item">
        <span>Google</span>
        ${connected.google ? `
          <button class="btn btn-sm btn-outline" data-action="disconnect-google">Disconnect</button>
        ` : `
          <button class="btn btn-sm btn-primary" data-action="connect-google">Connect</button>
        `}
      </div>
      <div class="account-item">
        <span>GitHub</span>
        ${connected.github ? `
          <button class="btn btn-sm btn-outline" data-action="disconnect-github">Disconnect</button>
        ` : `
          <button class="btn btn-sm btn-primary" data-action="connect-github">Connect</button>
        `}
      </div>
    `;
  }

  renderActivityTab() {
    return `
      <div class="activity-tab">
        <h3>Recent Activity</h3>
        <div class="activity-list">
          <div class="loading-activity">Loading activity...</div>
        </div>
      </div>
    `;
  }

  renderPermissionsTab() {
    return `
      <div class="permissions-tab">
        <h3>Permissions</h3>
        <div class="permissions-list">
          ${this.renderPermissions()}
        </div>
      </div>
    `;
  }

  renderPermissions() {
    const permissions = this.user.permissions || [];
    
    return permissions.map(permission => `
      <div class="permission-item">
        <div class="permission-info">
          <h4>${permission.name}</h4>
          <p>${permission.description}</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" ${permission.granted ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    `).join('');
  }

  attachEventListeners() {
    // Tab switching
    this.container.addEventListener('click', (e) => {
      if (e.target.matches('[data-tab]')) {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      }
    });

    // Profile actions
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleAction(action);
      }
    });

    // Form inputs
    if (this.isEditing) {
      const form = this.container.querySelector('.profile-form');
      form?.addEventListener('input', (e) => {
        this.user[e.target.name] = e.target.value;
      });
    }

    // Avatar upload
    const avatarBtn = this.container.querySelector('[data-action="change-avatar"]');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', () => this.uploadAvatar());
    }
  }

  switchTab(tab) {
    this.activeTab = tab;
    
    // Update tab buttons
    const tabButtons = this.container.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update tab content
    const tabContent = this.container.querySelector('.tab-content');
    tabContent.innerHTML = this.renderActiveTab();
    
    // Load additional data for specific tabs
    if (tab === 'activity') {
      this.loadActivity();
    }
  }

  handleAction(action) {
    switch (action) {
      case 'edit':
        this.startEditing();
        break;
      case 'save':
        this.saveProfile();
        break;
      case 'cancel':
        this.cancelEditing();
        break;
      case 'change-avatar':
        this.uploadAvatar();
        break;
      case 'change-password':
        this.changePassword();
        break;
    }
  }

  startEditing() {
    this.isEditing = true;
    this.render();
    this.attachEventListeners();
  }

  async saveProfile() {
    try {
      const form = this.container.querySelector('.profile-form');
      const formData = new FormData(form);
      const updates = {};

      formData.forEach((value, key) => {
        if (this.user[key] !== value) {
          updates[key] = value;
        }
      });

      if (Object.keys(updates).length > 0) {
        await userManagementService.updateUserProfile(this.user.id, updates);
        this.user = { ...this.user, ...updates };
        this.originalUser = { ...this.user };
        this.emit('profileUpdated', this.user);
      }

      this.isEditing = false;
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showError('Failed to save profile');
    }
  }

  cancelEditing() {
    this.user = { ...this.originalUser };
    this.isEditing = false;
    this.render();
    this.attachEventListeners();
  }

  async uploadAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const avatarUrl = await userManagementService.uploadAvatar(this.user.id, file);
        this.user.avatarUrl = avatarUrl;
        this.originalUser = { ...this.user };
        this.render();
        this.emit('avatarUpdated', avatarUrl);
      } catch (error) {
        console.error('Error uploading avatar:', error);
        this.showError('Failed to upload avatar');
      }
    };
    
    input.click();
  }

  canEdit() {
    if (this.options.mode === 'admin') return true;
    if (this.options.mode === 'edit') return true;
    return this.user.id === userManagementService.getCurrentUser()?.id;
  }

  async loadActivity() {
    try {
      const activity = await userManagementService.getUserActivity(this.user.id, { limit: 20 });
      const activityList = this.container.querySelector('.activity-list');
      
      if (activityList) {
        activityList.innerHTML = this.renderActivityList(activity);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
      const activityList = this.container.querySelector('.activity-list');
      if (activityList) {
        activityList.innerHTML = '<div class="error">Failed to load activity</div>';
      }
    }
  }

  renderActivityList(activity) {
    if (!activity || activity.length === 0) {
      return '<div class="empty-state">No activity found</div>';
    }

    return activity.map(item => `
      <div class="activity-item">
        <div class="activity-icon">
          <i class="icon-${item.type}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">${item.title}</div>
          <div class="activity-description">${item.description}</div>
          <div class="activity-time">${this.formatActivityTime(item.createdAt)}</div>
        </div>
      </div>
    `).join('');
  }

  formatActivityTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    
    return date.toLocaleDateString();
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    this.container.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
  }

  async refresh() {
    await this.loadUserDetails();
    this.render();
    this.attachEventListeners();
  }

  destroy() {
    this.container.innerHTML = '';
    this.removeAllListeners();
  }
}