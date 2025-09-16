/**
 * Member Invite Dialog Component
 */

import { Component } from '../base/Component.js';
import { workspaceService } from '../../services/workspace.js';
import { eventBus } from '../../utils/events.js';

export class MemberInviteDialog extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            currentStep: 1,
            totalSteps: 2,
            errors: {},
            formData: {
                emails: [],
                role: 'editor',
                message: '',
                sendEmail: true
            }
        };
        
        this.roles = [
            {
                value: 'admin',
                label: 'Admin',
                description: 'Can manage members and workspace settings',
                permissions: ['read', 'write', 'delete', 'manage_members', 'manage_workspace']
            },
            {
                value: 'editor',
                label: 'Editor',
                description: 'Can create and edit content',
                permissions: ['read', 'write', 'delete']
            },
            {
                value: 'viewer',
                label: 'Viewer',
                description: 'Can only view content',
                permissions: ['read']
            }
        ];
        
        this.defaultMessage = this.getDefaultMessage();
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.focusFirstInput();
        
        // Trap focus within dialog
        this.setupFocusTrap();
    }
    
    getDefaultMessage() {
        const currentUser = workspaceService.getCurrentWorkspace();
        const workspaceName = currentUser ? currentUser.name : 'workspace';
        
        return `Hi there!\n\nYou've been invited to join "${workspaceName}" where we collaborate on projects and manage tasks together.\n\nClick the link below to accept the invitation and get started.\n\nBest regards`;
    }
    
    render() {
        const { isLoading, currentStep, totalSteps } = this.state;
        
        this.container.innerHTML = `
            <div class="dialog-overlay" data-action="close-dialog"></div>
            <div class="dialog-content member-invite-dialog" role="dialog" aria-labelledby="dialog-title" aria-modal="true">
                <div class="dialog-header">
                    <h2 id="dialog-title" class="dialog-title">Invite Members</h2>
                    <button type="button" class="dialog-close" data-action="close-dialog" aria-label="Close dialog">
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="dialog-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(currentStep / totalSteps) * 100}%"></div>
                    </div>
                    <div class="progress-steps">
                        ${Array.from({ length: totalSteps }, (_, i) => `
                            <div class="progress-step ${i + 1 <= currentStep ? 'progress-step--active' : ''} ${i + 1 < currentStep ? 'progress-step--completed' : ''}">
                                <span class="progress-step-number">${i + 1}</span>
                                <span class="progress-step-label">${this.getStepLabel(i + 1)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <form class="dialog-form" novalidate>
                    ${this.renderCurrentStep()}
                </form>
                
                <div class="dialog-footer">
                    <div class="dialog-actions">
                        ${currentStep > 1 ? `
                            <button type="button" class="btn btn--outline" data-action="prev-step" ${isLoading ? 'disabled' : ''}>
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="15,18 9,12 15,6"></polyline>
                                </svg>
                                Previous
                            </button>
                        ` : ''}
                        
                        <button type="button" class="btn btn--ghost" data-action="close-dialog" ${isLoading ? 'disabled' : ''}>
                            Cancel
                        </button>
                        
                        ${currentStep < totalSteps ? `
                            <button type="button" class="btn btn--primary" data-action="next-step" ${isLoading || !this.isCurrentStepValid() ? 'disabled' : ''}>
                                Next
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="9,18 15,12 9,6"></polyline>
                                </svg>
                            </button>
                        ` : `
                            <button type="button" class="btn btn--primary" data-action="send-invitations" ${isLoading || !this.isFormValid() ? 'disabled' : ''}>
                                ${isLoading ? `
                                    <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
                                        <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    Sending Invitations...
                                ` : `
                                    Send ${this.state.formData.emails.length} Invitation${this.state.formData.emails.length !== 1 ? 's' : ''}
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                `}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCurrentStep() {
        switch (this.state.currentStep) {
            case 1:
                return this.renderEmailStep();
            case 2:
                return this.renderDetailsStep();
            default:
                return '';
        }
    }
    
    renderEmailStep() {
        const { formData, errors } = this.state;
        
        return `
            <div class="form-step" data-step="1">
                <div class="form-step-header">
                    <h3 class="form-step-title">Add Email Addresses</h3>
                    <p class="form-step-description">Enter the email addresses of people you want to invite to this workspace.</p>
                </div>
                
                <div class="form-group">
                    <label for="email-input" class="form-label">Email addresses</label>
                    <div class="email-input-container">
                        <input 
                            type="email" 
                            id="email-input" 
                            class="form-input ${errors.email ? 'form-input--error' : ''}" 
                            placeholder="Enter email addresses..."
                            data-email-input
                            autofocus
                        />
                        <button type="button" class="btn btn--outline btn--sm" data-action="add-email">
                            Add
                        </button>
                    </div>
                    ${errors.email ? `<span class="form-error">${errors.email}</span>` : ''}
                    <div class="form-hint">
                        Press Enter or click Add to add each email address. You can also paste multiple addresses separated by commas.
                    </div>
                </div>
                
                ${formData.emails.length > 0 ? `
                    <div class="added-emails">
                        <h4 class="added-emails-title">
                            People to invite (${formData.emails.length})
                        </h4>
                        <div class="email-list">
                            ${formData.emails.map((email, index) => `
                                <div class="email-item">
                                    <div class="email-info">
                                        <div class="email-avatar">
                                            ${this.getEmailInitials(email)}
                                        </div>
                                        <div class="email-details">
                                            <div class="email-address">${email}</div>
                                            <div class="email-status">Invitation pending</div>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        class="btn btn--ghost btn--icon" 
                                        data-action="remove-email" 
                                        data-index="${index}"
                                        aria-label="Remove ${email}"
                                    >
                                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="quick-actions">
                    <h4 class="quick-actions-title">Quick Actions</h4>
                    <div class="quick-action-buttons">
                        <button type="button" class="btn btn--outline btn--sm" data-action="import-csv">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14,2 14,8 20,8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10,9 9,9 8,9"></polyline>
                            </svg>
                            Import from CSV
                        </button>
                        <button type="button" class="btn btn--outline btn--sm" data-action="copy-invite-link">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                            Copy Invite Link
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderDetailsStep() {
        const { formData } = this.state;
        
        return `
            <div class="form-step" data-step="2">
                <div class="form-step-header">
                    <h3 class="form-step-title">Invitation Details</h3>
                    <p class="form-step-description">Set the role and customize the invitation message for your new members.</p>
                </div>
                
                <div class="form-group">
                    <label for="member-role" class="form-label">Member Role</label>
                    <select id="member-role" name="role" class="form-select" data-role-select>
                        ${this.roles.map(role => `
                            <option value="${role.value}" ${role.value === formData.role ? 'selected' : ''}>
                                ${role.label}
                            </option>
                        `).join('')}
                    </select>
                    
                    <div class="role-info">
                        ${this.roles.map(role => `
                            <div class="role-description ${role.value === formData.role ? 'role-description--active' : ''}" data-role="${role.value}">
                                <h5 class="role-description-title">${role.label}</h5>
                                <p class="role-description-text">${role.description}</p>
                                <div class="role-permissions">
                                    <span class="role-permissions-label">Permissions:</span>
                                    <div class="permission-tags">
                                        ${role.permissions.map(permission => `
                                            <span class="permission-tag">${this.formatPermission(permission)}</span>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="invitation-message" class="form-label">Invitation Message</label>
                    <textarea 
                        id="invitation-message" 
                        name="message" 
                        class="form-textarea" 
                        rows="6"
                        placeholder="Enter a personal message (optional)"
                        data-message-input
                    >${formData.message || this.defaultMessage}</textarea>
                    <div class="form-hint">
                        <span class="form-counter">${(formData.message || this.defaultMessage).length}/500</span>
                        <button type="button" class="btn btn--ghost btn--sm" data-action="reset-message">
                            Reset to default
                        </button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input 
                            type="checkbox" 
                            name="sendEmail" 
                            ${formData.sendEmail ? 'checked' : ''}
                            data-send-email-checkbox
                        />
                        <span class="checkbox-checkmark"></span>
                        <span class="checkbox-content">
                            <span class="checkbox-text">Send email invitations</span>
                            <span class="checkbox-description">Members will receive an email with the invitation link and your message</span>
                        </span>
                    </label>
                </div>
                
                <div class="invitation-preview">
                    <h4 class="invitation-preview-title">
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Invitation Preview
                    </h4>
                    <div class="invitation-summary">
                        <div class="summary-item">
                            <span class="summary-label">Recipients:</span>
                            <span class="summary-value">${formData.emails.length} member${formData.emails.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Role:</span>
                            <span class="summary-value">${this.getRoleLabel(formData.role)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Email notification:</span>
                            <span class="summary-value">${formData.sendEmail ? 'Yes' : 'No'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
        this.container.addEventListener('input', this.handleInput.bind(this));
        this.container.addEventListener('change', this.handleChange.bind(this));
        this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    handleClick(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        
        switch (action) {
            case 'close-dialog':
                this.handleClose();
                break;
            case 'prev-step':
                this.handlePrevStep();
                break;
            case 'next-step':
                this.handleNextStep();
                break;
            case 'send-invitations':
                this.handleSendInvitations();
                break;
            case 'add-email':
                this.handleAddEmail();
                break;
            case 'remove-email':
                this.handleRemoveEmail(parseInt(event.target.closest('[data-index]').dataset.index));
                break;
            case 'import-csv':
                this.handleImportCSV();
                break;
            case 'copy-invite-link':
                this.handleCopyInviteLink();
                break;
            case 'reset-message':
                this.handleResetMessage();
                break;
        }
    }
    
    handleInput(event) {
        if (event.target.dataset.messageInput !== undefined) {
            this.state.formData.message = event.target.value;
            this.updateMessageCounter();
        }
    }
    
    handleChange(event) {
        if (event.target.dataset.roleSelect !== undefined) {
            this.state.formData.role = event.target.value;
            this.updateRoleDescription();
        } else if (event.target.dataset.sendEmailCheckbox !== undefined) {
            this.state.formData.sendEmail = event.target.checked;
        }
    }
    
    handleKeyDown(event) {
        // Handle Escape key
        if (event.key === 'Escape') {
            this.handleClose();
        }
        
        // Handle Enter in email input
        if (event.key === 'Enter' && event.target.dataset.emailInput !== undefined) {
            event.preventDefault();
            this.handleAddEmail();
        }
    }
    
    handleClose() {
        if (this.options.onClose) {
            this.options.onClose();
        } else {
            this.destroy();
        }
    }
    
    handlePrevStep() {
        if (this.state.currentStep > 1) {
            this.setState({ currentStep: this.state.currentStep - 1 });
        }
    }
    
    handleNextStep() {
        if (this.validateCurrentStep()) {
            this.setState({ currentStep: this.state.currentStep + 1 });
        }
    }
    
    async handleSendInvitations() {
        if (this.state.isLoading || !this.isFormValid()) return;
        
        this.setState({ isLoading: true, errors: {} });
        
        try {
            const currentWorkspace = workspaceService.getCurrentWorkspace();
            if (!currentWorkspace) {
                throw new Error('No workspace selected');
            }
            
            const { emails, role, message, sendEmail } = this.state.formData;
            
            // Send invitations for each email
            const results = await Promise.allSettled(
                emails.map(email => 
                    workspaceService.inviteMember(currentWorkspace.id, {
                        email,
                        role,
                        message: sendEmail ? message : undefined,
                        sendEmail
                    })
                )
            );
            
            // Check results
            const successful = results.filter(result => result.status === 'fulfilled').length;
            const failed = results.filter(result => result.status === 'rejected').length;
            
            this.setState({ isLoading: false });
            
            if (successful > 0) {
                eventBus.emit('notification:success', {
                    message: `${successful} invitation${successful !== 1 ? 's' : ''} sent successfully!`
                });
            }
            
            if (failed > 0) {
                eventBus.emit('notification:warning', {
                    message: `${failed} invitation${failed !== 1 ? 's' : ''} failed to send. Please try again.`
                });
            }
            
            if (this.options.onSuccess) {
                this.options.onSuccess({ successful, failed });
            }
            
            this.handleClose();
        } catch (error) {
            this.setState({
                isLoading: false,
                errors: { submit: error.message }
            });
        }
    }
    
    handleAddEmail() {
        const emailInput = this.container.querySelector('[data-email-input]');
        const emailValue = emailInput.value.trim();
        
        if (!emailValue) return;
        
        // Clear previous email errors
        if (this.state.errors.email) {
            delete this.state.errors.email;
            this.render();
        }
        
        // Split by comma and clean up
        const emails = emailValue.split(',').map(email => email.trim()).filter(email => email);
        const validEmails = [];
        const invalidEmails = [];
        
        for (const email of emails) {
            if (this.isValidEmail(email)) {
                if (!this.state.formData.emails.includes(email)) {
                    validEmails.push(email);
                }
            } else {
                invalidEmails.push(email);
            }
        }
        
        if (invalidEmails.length > 0) {
            this.setState({
                errors: {
                    ...this.state.errors,
                    email: `Invalid email address${invalidEmails.length > 1 ? 'es' : ''}: ${invalidEmails.join(', ')}`
                }
            });
            return;
        }
        
        if (validEmails.length > 0) {
            this.state.formData.emails.push(...validEmails);
            emailInput.value = '';
            this.render();
        }
    }
    
    handleRemoveEmail(index) {
        this.state.formData.emails.splice(index, 1);
        this.render();
    }
    
    handleImportCSV() {
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.parseCSVFile(file);
            }
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }
    
    async parseCSVFile(file) {
        try {
            const text = await file.text();
            const lines = text.split('\n');
            const emails = [];
            
            for (const line of lines) {
                const email = line.trim().replace(/[",]/g, '');
                if (email && this.isValidEmail(email)) {
                    emails.push(email);
                }
            }
            
            if (emails.length > 0) {
                // Add unique emails
                const uniqueEmails = emails.filter(email => !this.state.formData.emails.includes(email));
                this.state.formData.emails.push(...uniqueEmails);
                this.render();
                
                eventBus.emit('notification:success', {
                    message: `Imported ${uniqueEmails.length} email address${uniqueEmails.length !== 1 ? 'es' : ''} from CSV`
                });
            } else {
                eventBus.emit('notification:error', {
                    message: 'No valid email addresses found in the CSV file'
                });
            }
        } catch (error) {
            eventBus.emit('notification:error', {
                message: 'Failed to read CSV file'
            });
        }
    }
    
    async handleCopyInviteLink() {
        try {
            const currentWorkspace = workspaceService.getCurrentWorkspace();
            if (!currentWorkspace) return;
            
            // Generate invite link (this would typically come from the server)
            const inviteLink = `${window.location.origin}/invite/${currentWorkspace.id}`;
            
            await navigator.clipboard.writeText(inviteLink);
            eventBus.emit('notification:success', {
                message: 'Invite link copied to clipboard!'
            });
        } catch (error) {
            eventBus.emit('notification:error', {
                message: 'Failed to copy invite link'
            });
        }
    }
    
    handleResetMessage() {
        this.state.formData.message = this.defaultMessage;
        const messageInput = this.container.querySelector('[data-message-input]');
        if (messageInput) {
            messageInput.value = this.defaultMessage;
        }
        this.updateMessageCounter();
    }
    
    updateRoleDescription() {
        const roleDescriptions = this.container.querySelectorAll('.role-description');
        roleDescriptions.forEach(desc => {
            desc.classList.toggle('role-description--active', desc.dataset.role === this.state.formData.role);
        });
    }
    
    updateMessageCounter() {
        const counter = this.container.querySelector('.form-counter');
        if (counter) {
            const length = (this.state.formData.message || this.defaultMessage).length;
            counter.textContent = `${length}/500`;
        }
    }
    
    validateCurrentStep() {
        switch (this.state.currentStep) {
            case 1:
                return this.state.formData.emails.length > 0;
            case 2:
                return true; // Role and message are optional/have defaults
            default:
                return false;
        }
    }
    
    isCurrentStepValid() {
        return this.validateCurrentStep();
    }
    
    isFormValid() {
        return this.state.formData.emails.length > 0;
    }
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    getStepLabel(step) {
        switch (step) {
            case 1: return 'Add Emails';
            case 2: return 'Details';
            default: return '';
        }
    }
    
    getRoleLabel(role) {
        const roleInfo = this.roles.find(r => r.value === role);
        return roleInfo ? roleInfo.label : role;
    }
    
    formatPermission(permission) {
        return permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    getEmailInitials(email) {
        const parts = email.split('@')[0].split('.');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return email.slice(0, 2).toUpperCase();
    }
    
    setupFocusTrap() {
        const focusableElements = this.container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        this.container.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }
    
    focusFirstInput() {
        setTimeout(() => {
            const firstInput = this.container.querySelector('input:not([type="hidden"]):not([disabled])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
    
    destroy() {
        super.destroy();
    }
} 