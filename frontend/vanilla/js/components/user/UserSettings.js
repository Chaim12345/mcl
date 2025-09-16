/**
 * User Settings Component
 * Comprehensive user settings and profile management interface
 */

import { userManagementService } from '../../services/userManagement.js';
import { UserProfile } from './UserProfile.js';
import { EventEmitter } from '../../utils/eventEmitter.js';

export class UserSettings extends EventEmitter {
  constructor(container, userId = null, options = {}) {
    super();
    this.container = container;
    this.userId = userId || userManagementService.getCurrentUser()?.id;
    this.options = {
      mode: 'self',
      showProfile: true,
      showSecurity: true,
      showPreferences: true,
      showActivity: true,
      ...options
    };
    
    this.currentTab = 'profile';
    this.user = null;
    
    this.init();
  }

  async init() {
    await this.loadUser();
    this.render();
    this.attachEventListeners();
  }

  async loadUser() {
    try {
      this.user = await userManagementService.getUserById(this.userId);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  render() {
    if (!this.user) {
      this.container.innerHTML = '<div class="error">User not found</div>';
      return;
    }

    this.container.innerHTML = `
      <div class="user-settings-container">
        ${this.renderHeader()}
        ${this.renderNavigation()}
        ${this.renderContent()}
      </div>
    `;
  }

  renderHeader() {
    return `
      <div class="settings-header">
        <h1>Settings</h1>
        <p>Manage your profile, security, and preferences</p>
      </div>
    `;
  }

  renderNavigation() {
    const tabs = [];
    if (this.options.showProfile) tabs.push('profile');
    if (this.options.showSecurity) tabs.push('security');
    if (this.options.showPreferences) tabs.push('preferences');
    if (this.options.showActivity) tabs.push('activity');
    
    return `
      <div class="settings-nav">
        ${tabs.map(tab => `
          <button class="nav-btn ${this.currentTab === tab ? 'active' : ''}" 
                  data-tab="${tab}">
            ${this.capitalizeFirst(tab)}
          </button>
        `).join('')}
      </div>
    `;
  }

  renderContent() {
    return `
      <div class="settings-content">
        <div id="settingsContent">
          ${this.renderCurrentTab()}
        </div>
      </div>
    `;
  }

  renderCurrentTab() {
    switch (this.currentTab) {
      case 'profile':
        return `<div id="userProfileContainer"></div>`;
      case 'security':
        return this.renderSecurityTab();
      case 'preferences':
        return this.renderPreferencesTab();
      case 'activity':
        return `<div id="userActivityContainer"></div>`;
      default:
        return `<div id="userProfileContainer"></div>`;
    }
  }

  renderSecurityTab() {
    return `
      <div class="security-section">
        <h2>Security Settings</h2>
        
        <div class="security-card">
          <h3>Password</h3>
          <p>Change your password regularly to keep your account secure</p>
          <button class="btn btn-primary" data-action="change-password">Change Password</button>
        </div>
        
        <div class="security-card">
          <h3>Two-Factor Authentication</h3>
          <p>Add an extra layer of security to your account</p>
          <label class="toggle-switch">
            <input type="checkbox" id="twoFactorEnabled" ${this.user.security?.twoFactorEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        
        <div class="security-card">
          <h3>Connected Accounts</h3>
          <div class="connected-accounts">
            ${this.renderConnectedAccounts()}
          </div>
        </div>
        
        <div class="security-card">
          <h3>Active Sessions</h3>
          <div class="sessions-list">
            ${this.renderActiveSessions()}
          </div>
        </div>
      </div>
    `;
  }

  renderPreferencesTab() {
    return `
      <div class="preferences-section">
        <h2>Preferences</h2>
        
        <div class="preference-group">
          <h3>Display & Theme</h3>
          <label class="preference-item">
            <span>Theme</span>
            <select id="themePreference" class="form-control">
              <option value="auto" ${this.user.preferences?.theme === 'auto' ? 'selected' : ''}>Auto</option>
              <option value="light" ${this.user.preferences?.theme === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${this.user.preferences?.theme === 'dark' ? 'selected' : ''}>Dark</option>
            </select>
          </label>
          
          <label class="preference-item">
            <span>Language</span>
            <select id="languagePreference" class="form-control">
              <option value="en" ${this.user.preferences?.language === 'en' ? 'selected' : ''}>English</option>
              <option value="es" ${this.user.preferences?.language === 'es' ? 'selected' : ''}>Spanish</option>
              <option value="fr" ${this.user.preferences?.language === 'fr' ? 'selected' : ''}>French</option>
            </select>
          </label>
          
          <label class="preference-item">
            <span>Time Zone</span>
            <select id="timezonePreference" class="form-control">
              <option value="auto" ${this.user.preferences?.timezone === 'auto' ? 'selected' : ''}>Auto-detect</option>
              <option value="UTC">UTC</option>
              <option value="local">Local Time</option>
            </select>
          </label>
        </div>
        
        <div class="preference-group">
          <h3>Notifications</h3>
          <label class="preference-item">
            <span>Email Notifications</span>
            <input type="checkbox" id="emailNotifications" ${this.user.preferences?.emailNotifications !== false ? 'checked' : ''}>
          </label>
          
          <label class="preference-item">
            <span>Push Notifications</span>
            <input type="checkbox" id="pushNotifications" ${this.user.preferences?.pushNotifications !== false ? 'checked' : ''}>
          </label>
          
          <label class="preference-item">
            <span>Activity Digest</span>
            <select id="activityDigest" class="form-control">
              <option value="daily" ${this.user.preferences?.activityDigest === 'daily' ? 'selected' : ''}>Daily</option>
              <option value="weekly" ${this.user.preferences?.activityDigest === 'weekly' ? 'selected' : ''}>Weekly</option>
              <option value="never" ${this.user.preferences?.activityDigest === 'never' ? 'selected' : ''}>Never</option>
            </select>
          </label>
        </div>
        
        <div class="preference-group">
          <h3>Privacy</h3>
          <label class="preference-item">
            <span>Profile Visibility</span>
            <select id="profileVisibility" class="form-control">
              <option value="public" ${this.user.preferences?.profileVisibility === 'public' ? 'selected' : ''}>Public</option>
              <option value="workspace" ${this.user.preferences?.profileVisibility === 'workspace' ? 'selected' : ''}>Workspace Only</option>
              <option value="private" ${this.user.preferences?.profileVisibility === 'private' ? 'selected' : ''}>Private</option>
            </select>
          </label>
          
          <label class="preference-item">
            <span>Show Email on Profile</span>
            <input type="checkbox" id="showEmail" ${this.user.preferences?.showEmail ? 'checked' : ''}>
          </label>
        </div>
      </div>
    `;
  }

  renderConnectedAccounts() {
    const accounts = this.user.connectedAccounts || {};
    
    return `
      <div class="account-list">
        <div class="account-item">
          <div class="account-info">
            <i class="icon-google"></i>
            <span>Google</span>
          </div>
          ${accounts.google ? `
            <button class="btn btn-sm btn-outline" data-action="disconnect-google">Disconnect</button>
          ` : `
            <button class="btn btn-sm btn-primary" data-action="connect-google">Connect</button>
          `}
        </div>
        
        <div class="account-item">
          <div class="account-info">
            <i class="icon-github"></i>
            <span>GitHub</span>
          </div>
          ${accounts.github ? `
            <button class="btn btn-sm btn-outline" data-action="disconnect-github">Disconnect</button>
          ` : `
            <button class="btn btn-sm btn-primary" data-action="connect-github">Connect</button>
          `}
        </div>
      </div>
    `;
  }

  renderActiveSessions() {
    const sessions = this.user.activeSessions || [];
    
    return sessions.map(session => `
      <div class="session-item">
        <div class="session-info">
          <div class="session-device">${session.device}</div>
          <div class="session-details">
            ${session.location} • ${this.formatDate(session.lastActive)}
          </div>
        </div>
        <button class="btn btn-sm btn-outline" data-action="revoke-session" data-session-id="${session.id}">
          Revoke
        </button>
      </div>
    `).join('');
  }

  attachEventListeners() {
    // Tab switching
    this.container.addEventListener('click', (e) => {
      if (e.target.matches('[data-tab]')) {
        this.switchTab(e.target.dataset.tab);
      }
    });
    
    // Form submissions
    this.container.addEventListener('change', (e) => {
      if (e.target.matches('select, input[type="checkbox"]')) {
        this.handlePreferenceChange(e.target);
      }
    });
    
    // Action buttons
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleAction(action, e.target);
      }
    });
  }

  switchTab(tab) {
    this.currentTab = tab;
    
    // Update navigation
    const navButtons = this.container.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update content
    const contentContainer = this.container.querySelector('#settingsContent');
    contentContainer.innerHTML = this.renderCurrentTab();
    
    // Mount appropriate components
    if (tab === 'profile') {
      const profileContainer = contentContainer.querySelector('#userProfileContainer');
      if (profileContainer) {
        new UserProfile(profileContainer, this.user, { mode: 'edit' });
      }
    } else if (tab === 'activity') {
      const activityContainer = contentContainer.querySelector('#userActivityContainer');
      if (activityContainer) {
        // Import and mount UserActivity component
        import('./UserActivity.js').then(module => {
          new module.UserActivity(activityContainer, this.userId);
        });
      }
    }
  }

  handlePreferenceChange(element) {
    const key = element.id.replace(/Preference$/g, '');
    const value = element.type === 'checkbox' ? element.checked : element.value;
    
    // Update preferences
    const preferences = { ...this.user.preferences, [key]: value };
    this.updateUserPreferences(preferences);
  }

  async updateUserPreferences(preferences) {
    try {
      await userManagementService.updateUserProfile(this.userId, { preferences });
      this.user.preferences = preferences;
      this.emit('preferencesUpdated', preferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
      this.showError('Failed to update preferences');
    }
  }

  handleAction(action, target) {
    switch (action) {
      case 'change-password':
        this.handleChangePassword();
        break;
      case 'connect-google':
        this.handleConnectProvider('google');
        break;
      case 'connect-github':
        this.handleConnectProvider('github');
        break;
      case 'revoke-session':
        this.handleRevokeSession(target.dataset.sessionId);
        break;
    }
  }

  handleChangePassword() {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="password-modal">
        <h3>Change Password</h3>
        <form id="passwordForm">
          <div class="form-group">
            <label>Current Password</label>
            <input type="password" id="currentPassword" required>
          </div>
          <div class="form-group">
            <label>New Password</label>
            <input type="password" id="newPassword" required>
          </div>
          <div class="form-group">
            <label>Confirm New Password</label>
            <input type="password" id="confirmPassword" required>
          </div>
          <button type="submit" class="btn btn-primary">Change Password</button>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = modal.querySelector('#passwordForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Handle password change
      modal.remove();
    });
  }

  handleConnectProvider(provider) {
    // Handle OAuth connection
    console.log(`Connecting ${provider} account`);
  }

  async handleRevokeSession(sessionId) {
    try {
      // Revoke session implementation
      console.log('Revoking session:', sessionId);
    } catch (error) {
      console.error('Error revoking session:', error);
    }
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }

  showError(message) {
    console.error('Settings Error:', message);
  }

  async refresh() {
    await this.loadUser();
    this.render();
    this.attachEventListeners();
  }

  destroy() {
    this.container.innerHTML = '';
    this.removeAllListeners();
  }
}