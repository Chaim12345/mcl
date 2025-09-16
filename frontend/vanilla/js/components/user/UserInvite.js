/**
 * User Invite Component
 * Handles inviting new users to workspace with role selection and email templates
 */

import { userManagementService } from '../../services/userManagement.js';
import { EventEmitter } from '../../utils/eventEmitter.js';
import { debounce } from '../../utils/debounce.js';

export class UserInvite extends EventEmitter {
  constructor(container, workspaceId, options = {}) {
    super();
    this.container = container;
    this.workspaceId = workspaceId;
    this.options = {
      allowBulk: true,
      showTemplates: true,
      customMessage: true,
      requireApproval: false,
      ...options
    };
    
    this.inviteForm = {
      emails: [],
      role: 'member',
      message: '',
      sendCopy: false
    };
    
    this.emailSuggestions = [];
    this.isSearching = false;
    
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="user-invite-container">
        <div class="invite-header">
          <h2>Invite Users to Workspace</h2>
          <p>Add team members by email address to collaborate on this workspace</p>
        </div>
        
        <div class="invite-form">
          ${this.renderEmailInput()}
          ${this.renderRoleSelection()}
          ${this.options.customMessage ? this.renderCustomMessage() : ''}
          ${this.renderOptions()}
          ${this.renderPreview()}
          ${this.renderActions()}
        </div>
        
        ${this.renderBulkUpload()}
        ${this.renderRecentInvitations()}
      </div>
    `;
  }

  renderEmailInput() {
    return `
      <div class="form-section">
        <h3>Email Addresses</h3>
        <p>Enter email addresses of users you want to invite</p>
        
        <div class="email-input-container">
          <div class="email-tags-container" id="emailTags">
            ${this.inviteForm.emails.map(email => `
              <span class="email-tag">
                ${email}
                <button type="button" class="remove-email" data-email="${email}">×</button>
              </span>
            `).join('')}
          </div>
          
          <input type="email" 
                 class="email-input" 
                 id="emailInput"
                 placeholder="Enter email address and press Enter"
                 autocomplete="off">
        </div>
        
        <div class="email-suggestions" id="emailSuggestions" style="display: none;">
          <div class="suggestions-list"></div>
        </div>
        
        <div class="email-validation" id="emailValidation"></div>
      </div>
    `;
  }

  renderRoleSelection() {
    return `
      <div class="form-section">
        <h3>Role & Permissions</h3>
        <p>Select the role for invited users</p>
        
        <div class="role-selection">
          <label class="role-option">
            <input type="radio" name="role" value="viewer" ${this.inviteForm.role === 'viewer' ? 'checked' : ''}>
            <div class="role-card">
              <div class="role-icon"><i class="icon-eye"></i></div>
              <div class="role-details">
                <h4>Viewer</h4>
                <p>Can view boards and items, but cannot make changes</p>
                <ul>
                  <li>View all workspace content</li>
                  <li>Comment on items</li>
                  <li>Export data</li>
                </ul>
              </div>
            </div>
          </label>
          
          <label class="role-option">
            <input type="radio" name="role" value="member" ${this.inviteForm.role === 'member' ? 'checked' : ''}>
            <div class="role-card">
              <div class="role-icon"><i class="icon-users"></i></div>
              <div class="role-details">
                <h4>Member</h4>
                <p>Can actively contribute to workspace content</p>
                <ul>
                  <li>All viewer permissions</li>
                  <li>Create and edit items</li>
                  <li>Manage own items</li>
                  <li>Add comments and attachments</li>
                </ul>
              </div>
            </div>
          </label>
          
          <label class="role-option">
            <input type="radio" name="role" value="admin" ${this.inviteForm.role === 'admin' ? 'checked' : ''}>
            <div class="role-card">
              <div class="role-icon"><i class="icon-settings"></i></div>
              <div class="role-details">
                <h4>Admin</h4>
                <p>Full workspace management capabilities</p>
                <ul>
                  <li>All member permissions</li>
                  <li>Manage workspace settings</li>
                  <li>Manage other members</li>
                  <li>Create and manage boards</li>
                </ul>
              </div>
            </div>
          </label>
        </div>
      </div>
    `;
  }

  renderCustomMessage() {
    return `
      <div class="form-section">
        <h3>Custom Message</h3>
        <p>Add a personal message to your invitation</p>
        
        <textarea class="form-control message-textarea" 
                  id="customMessage"
                  rows="4"
                  placeholder="Hi! I'd like to invite you to collaborate with me on this workspace..."
                  maxlength="500">${this.inviteForm.message}</textarea>
        
        <div class="character-count">${this.inviteForm.message.length}/500</div>
      </div>
    `;
  }

  renderOptions() {
    return `
      <div class="form-section">
        <h3>Invitation Options</h3>
        
        <div class="options-list">
          <label class="checkbox-label">
            <input type="checkbox" id="sendCopy" ${this.inviteForm.sendCopy ? 'checked' : ''}>
            Send me a copy of the invitation email
          </label>
          
          ${this.options.requireApproval ? `
            <label class="checkbox-label">
              <input type="checkbox" id="requireApproval" checked>
              Require admin approval before access is granted
            </label>
          ` : ''}
          
          <label class="checkbox-label">
            <input type="checkbox" id="setExpiration" checked>
            Set invitation expiration (7 days)
          </label>
        </div>
      </div>
    `;
  }

  renderPreview() {
    return `
      <div class="form-section">
        <h3>Invitation Preview</h3>
        <div class="preview-container">
          <div class="preview-email">
            <div class="preview-header">
              <img src="/assets/logo.png" alt="Logo" class="preview-logo">
              <h4>You're invited to join a workspace</h4>
            </div>
            <div class="preview-content">
              <p>Hello,</p>
              <p>${this.inviteForm.message || 'You have been invited to join a workspace to collaborate on projects.'}</p>
              <p><strong>Workspace:</strong> ${this.workspaceId || 'Your Workspace'}</p>
              <p><strong>Your role:</strong> ${this.inviteForm.role}</p>
              <div class="preview-actions">
                <a href="#" class="btn btn-primary">Accept Invitation</a>
                <a href="#" class="btn btn-secondary">Learn More</a>
              </div>
              <p class="preview-footer">
                This invitation will expire in 7 days.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderActions() {
    return `
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" data-action="cancel">
          Cancel
        </button>
        <button type="button" class="btn btn-primary" data-action="send-invites" ${this.inviteForm.emails.length === 0 ? 'disabled' : ''}>
          Send Invitations (${this.inviteForm.emails.length})
        </button>
      </div>
    `;
  }

  renderBulkUpload() {
    if (!this.options.allowBulk) return '';
    
    return `
      <div class="bulk-upload-section">
        <h3>Bulk Upload</h3>
        <p>Upload a CSV file with email addresses</p>
        
        <div class="bulk-upload-form">
          <input type="file" id="bulkUploadFile" accept=".csv" style="display: none;">
          <button type="button" class="btn btn-outline" data-action="upload-csv">
            <i class="icon-upload"></i> Upload CSV
          </button>
          
          <a href="/assets/sample-invite.csv" class="download-template">
            <i class="icon-download"></i> Download template
          </a>
        </div>
      </div>
    `;
  }

  renderRecentInvitations() {
    return `
      <div class="recent-invitations">
        <h3>Recent Invitations</h3>
        <div class="invitations-list" id="recentInvitations">
          <div class="loading">Loading recent invitations...</div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Email input handling
    const emailInput = this.container.querySelector('#emailInput');
    const emailTags = this.container.querySelector('#emailTags');
    
    emailInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        this.addEmail(emailInput.value.trim());
        emailInput.value = '';
      }
    });

    emailInput?.addEventListener('input', debounce((e) => {
      this.handleEmailInput(e.target.value);
    }, 300));

    // Remove email tags
    emailTags?.addEventListener('click', (e) => {
      if (e.target.matches('.remove-email')) {
        const email = e.target.dataset.email;
        this.removeEmail(email);
      }
    });

    // Role selection
    const roleRadios = this.container.querySelectorAll('input[name="role"]');
    roleRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.inviteForm.role = e.target.value;
        this.updatePreview();
      });
    });

    // Custom message
    const customMessage = this.container.querySelector('#customMessage');
    customMessage?.addEventListener('input', (e) => {
      this.inviteForm.message = e.target.value;
      this.updateCharacterCount();
      this.updatePreview();
    });

    // Options
    const sendCopy = this.container.querySelector('#sendCopy');
    sendCopy?.addEventListener('change', (e) => {
      this.inviteForm.sendCopy = e.target.checked;
    });

    // Actions
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleAction(action);
      }
    });

    // Load recent invitations
    this.loadRecentInvitations();
  }

  addEmail(email) {
    if (!this.validateEmail(email)) {
      this.showEmailError('Please enter a valid email address');
      return;
    }

    if (this.inviteForm.emails.includes(email)) {
      this.showEmailError('Email already added');
      return;
    }

    this.inviteForm.emails.push(email);
    this.clearEmailError();
    this.updateEmailTags();
    this.updateSendButton();
    this.updatePreview();
  }

  removeEmail(email) {
    this.inviteForm.emails = this.inviteForm.emails.filter(e => e !== email);
    this.updateEmailTags();
    this.updateSendButton();
    this.updatePreview();
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  handleEmailInput(value) {
    if (value.length < 2) {
      this.hideEmailSuggestions();
      return;
    }

    this.searchEmailSuggestions(value);
  }

  async searchEmailSuggestions(query) {
    if (this.isSearching) return;
    
    this.isSearching = true;
    
    try {
      const suggestions = await userManagementService.searchUsers(query, { limit: 5 });
      this.emailSuggestions = suggestions.users || [];
      this.showEmailSuggestions();
    } catch (error) {
      console.error('Error searching email suggestions:', error);
    } finally {
      this.isSearching = false;
    }
  }

  showEmailSuggestions() {
    const suggestionsList = this.container.querySelector('.suggestions-list');
    if (!suggestionsList) return;

    suggestionsList.innerHTML = this.emailSuggestions
      .filter(user => user.email && !this.inviteForm.emails.includes(user.email))
      .map(user => `
        <div class="suggestion-item" data-email="${user.email}">
          <img src="${user.avatarUrl || '/assets/default-avatar.png'}" alt="${user.name}" class="suggestion-avatar">
          <div class="suggestion-info">
            <div class="suggestion-name">${user.name}</div>
            <div class="suggestion-email">${user.email}</div>
          </div>
        </div>
      `).join('');

    const suggestionsContainer = this.container.querySelector('#emailSuggestions');
    suggestionsContainer.style.display = suggestionsList.children.length > 0 ? 'block' : 'none';

    // Handle suggestion clicks
    suggestionsList.addEventListener('click', (e) => {
      const suggestion = e.target.closest('.suggestion-item');
      if (suggestion) {
        this.addEmail(suggestion.dataset.email);
        this.hideEmailSuggestions();
      }
    });
  }

  hideEmailSuggestions() {
    const suggestionsContainer = this.container.querySelector('#emailSuggestions');
    if (suggestionsContainer) {
      suggestionsContainer.style.display = 'none';
    }
  }

  updateEmailTags() {
    const emailTags = this.container.querySelector('#emailTags');
    emailTags.innerHTML = this.inviteForm.emails.map(email => `
      <span class="email-tag">
        ${email}
        <button type="button" class="remove-email" data-email="${email}">×</button>
      </span>
    `).join('');
  }

  updateCharacterCount() {
    const count = this.inviteForm.message.length;
    const countElement = this.container.querySelector('.character-count');
    if (countElement) {
      countElement.textContent = `${count}/500`;
      countElement.classList.toggle('text-danger', count > 450);
    }
  }

  updateSendButton() {
    const sendBtn = this.container.querySelector('[data-action="send-invites"]');
    if (sendBtn) {
      sendBtn.disabled = this.inviteForm.emails.length === 0;
      sendBtn.textContent = `Send Invitations (${this.inviteForm.emails.length})`;
    }
  }

  updatePreview() {
    const previewContent = this.container.querySelector('.preview-content p:nth-child(2)');
    if (previewContent) {
      previewContent.textContent = this.inviteForm.message || 'You have been invited to join a workspace to collaborate on projects.';
    }

    const roleElement = this.container.querySelector('.preview-content p:nth-child(4)');
    if (roleElement) {
      roleElement.innerHTML = `<strong>Your role:</strong> ${this.inviteForm.role}`;
    }
  }

  showEmailError(message) {
    const validation = this.container.querySelector('#emailValidation');
    if (validation) {
      validation.textContent = message;
      validation.className = 'email-validation error';
    }
  }

  clearEmailError() {
    const validation = this.container.querySelector('#emailValidation');
    if (validation) {
      validation.textContent = '';
      validation.className = 'email-validation';
    }
  }

  async handleAction(action) {
    switch (action) {
      case 'send-invites':
        await this.sendInvitations();
        break;
      case 'cancel':
        this.resetForm();
        this.emit('cancelled');
        break;
      case 'upload-csv':
        this.uploadCSV();
        break;
    }
  }

  async sendInvitations() {
    if (this.inviteForm.emails.length === 0) return;

    const sendBtn = this.container.querySelector('[data-action="send-invites"]');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
      const results = await Promise.all(
        this.inviteForm.emails.map(email =>
          userManagementService.inviteUserToWorkspace(this.workspaceId, email, this.inviteForm.role)
        )
      );

      this.emit('invitationsSent', results);
      this.resetForm();
      
      // Show success message
      this.showSuccess(`${results.length} invitation${results.length > 1 ? 's' : ''} sent successfully`);
    } catch (error) {
      console.error('Error sending invitations:', error);
      this.showError('Failed to send some invitations');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = `Send Invitations (${this.inviteForm.emails.length})`;
    }
  }

  uploadCSV() {
    const fileInput = this.container.querySelector('#bulkUploadFile');
    fileInput.click();

    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      this.processCSV(file);
    };
  }

  processCSV(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const emails = csv
        .split('\n')
        .map(line => line.trim())
        .filter(line => this.validateEmail(line))
        .filter((email, index, self) => self.indexOf(email) === index);

      emails.forEach(email => this.addEmail(email));
    };
    reader.readAsText(file);
  }

  resetForm() {
    this.inviteForm = {
      emails: [],
      role: 'member',
      message: '',
      sendCopy: false
    };
    
    this.updateEmailTags();
    this.updateSendButton();
    this.updatePreview();
  }

  async loadRecentInvitations() {
    try {
      const invitations = await userManagementService.getWorkspaceInvitations(this.workspaceId);
      const recentList = this.container.querySelector('#recentInvitations');
      
      if (recentList) {
        recentList.innerHTML = this.renderInvitationsList(invitations);
      }
    } catch (error) {
      console.error('Error loading recent invitations:', error);
      const recentList = this.container.querySelector('#recentInvitations');
      if (recentList) {
        recentList.innerHTML = '<div class="error">Failed to load invitations</div>';
      }
    }
  }

  renderInvitationsList(invitations) {
    if (!invitations || invitations.length === 0) {
      return '<div class="empty-state">No recent invitations</div>';
    }

    return invitations.slice(0, 5).map(invitation => `
      <div class="invitation-item">
        <div class="invitation-info">
          <div class="invitation-email">${invitation.email}</div>
          <div class="invitation-details">
            ${invitation.role} • ${this.formatInvitedAt(invitation.createdAt)}
          </div>
        </div>
        <div class="invitation-status">
          <span class="status-${invitation.status}">${invitation.status}</span>
        </div>
      </div>
    `).join('');
  }

  formatInvitedAt(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  showSuccess(message) {
    // Implementation for success message
    console.log('Success:', message);
  }

  showError(message) {
    // Implementation for error message
    console.error('Error:', message);
  }

  destroy() {
    this.container.innerHTML = '';
    this.removeAllListeners();
  }
}