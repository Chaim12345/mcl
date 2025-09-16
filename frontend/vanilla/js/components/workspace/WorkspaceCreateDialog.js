/**
 * Workspace Create Dialog Component
 */

import { Component } from '../base/Component.js';
import { workspaceService } from '../../services/workspace.js';
import { eventBus } from '../../utils/events.js';

export class WorkspaceCreateDialog extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            currentStep: 1,
            totalSteps: 3,
            errors: {},
            formData: {
                name: '',
                description: '',
                template: 'blank',
                isPrivate: false,
                inviteEmails: []
            }
        };
        
        this.validationRules = {
            name: [
                { rule: 'required', message: 'Workspace name is required' },
                { rule: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
                { rule: 'maxLength', value: 50, message: 'Name must be less than 50 characters' },
                { rule: 'pattern', value: /^[a-zA-Z0-9\s\-_]+$/, message: 'Name can only contain letters, numbers, spaces, hyphens, and underscores' }
            ],
            description: [
                { rule: 'maxLength', value: 200, message: 'Description must be less than 200 characters' }
            ]
        };
        
        this.templates = [
            {
                id: 'blank',
                name: 'Blank Workspace',
                description: 'Start with an empty workspace and build from scratch',
                icon: 'layout'
            },
            {
                id: 'project_management',
                name: 'Project Management',
                description: 'Pre-configured boards for managing projects and tasks',
                icon: 'clipboard'
            },
            {
                id: 'software_development',
                name: 'Software Development',
                description: 'Includes boards for sprint planning, bug tracking, and releases',
                icon: 'code'
            },
            {
                id: 'marketing',
                name: 'Marketing Team',
                description: 'Campaign planning, content calendar, and lead tracking',
                icon: 'megaphone'
            },
            {
                id: 'hr',
                name: 'Human Resources',
                description: 'Employee onboarding, recruitment, and team management',
                icon: 'users'
            },
            {
                id: 'sales',
                name: 'Sales Team',
                description: 'CRM-style boards for leads, deals, and customer management',
                icon: 'trending-up'
            }
        ];
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.focusFirstInput();
        
        // Trap focus within dialog
        this.setupFocusTrap();
    }
    
    render() {
        const { isLoading, currentStep, totalSteps } = this.state;
        
        this.container.innerHTML = `
            <div class="dialog-overlay" data-action="close-dialog"></div>
            <div class="dialog-content workspace-create-dialog" role="dialog" aria-labelledby="dialog-title" aria-modal="true">
                <div class="dialog-header">
                    <h2 id="dialog-title" class="dialog-title">Create New Workspace</h2>
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
                            <button type="button" class="btn btn--primary" data-action="create-workspace" ${isLoading || !this.isFormValid() ? 'disabled' : ''}>
                                ${isLoading ? `
                                    <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
                                        <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    Creating...
                                ` : `
                                    Create Workspace
                                    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <polyline points="20,6 9,17 4,12"></polyline>
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
                return this.renderBasicInfoStep();
            case 2:
                return this.renderTemplateStep();
            case 3:
                return this.renderInviteStep();
            default:
                return '';
        }
    }
    
    renderBasicInfoStep() {
        const { formData, errors } = this.state;
        
        return `
            <div class="form-step" data-step="1">
                <div class="form-step-header">
                    <h3 class="form-step-title">Basic Information</h3>
                    <p class="form-step-description">Give your workspace a name and description to help your team understand its purpose.</p>
                </div>
                
                <div class="form-group">
                    <label for="workspace-name" class="form-label">Workspace Name *</label>
                    <input 
                        type="text" 
                        id="workspace-name" 
                        name="name" 
                        class="form-input ${errors.name ? 'form-input--error' : ''}"
                        placeholder="e.g. Acme Corp Project Management"
                        value="${formData.name}"
                        maxlength="50"
                        required
                        autofocus
                    />
                    ${errors.name ? `<span class="form-error">${errors.name}</span>` : ''}
                    <div class="form-hint">
                        <span class="form-counter">${formData.name.length}/50</span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="workspace-description" class="form-label">Description</label>
                    <textarea 
                        id="workspace-description" 
                        name="description" 
                        class="form-textarea ${errors.description ? 'form-input--error' : ''}"
                        placeholder="Optional: Describe what this workspace is for..."
                        rows="3"
                        maxlength="200"
                    >${formData.description}</textarea>
                    ${errors.description ? `<span class="form-error">${errors.description}</span>` : ''}
                    <div class="form-hint">
                        <span class="form-counter">${formData.description.length}/200</span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input 
                            type="checkbox" 
                            name="isPrivate" 
                            ${formData.isPrivate ? 'checked' : ''}
                        />
                        <span class="checkbox-checkmark"></span>
                        <span class="checkbox-content">
                            <span class="checkbox-text">Make this workspace private</span>
                            <span class="checkbox-description">Only invited members can access this workspace</span>
                        </span>
                    </label>
                </div>
            </div>
        `;
    }
    
    renderTemplateStep() {
        const { formData } = this.state;
        
        return `
            <div class="form-step" data-step="2">
                <div class="form-step-header">
                    <h3 class="form-step-title">Choose a Template</h3>
                    <p class="form-step-description">Select a template to get started quickly, or choose blank to start from scratch.</p>
                </div>
                
                <div class="template-grid">
                    ${this.templates.map(template => `
                        <label class="template-card ${formData.template === template.id ? 'template-card--selected' : ''}" for="template-${template.id}">
                            <input 
                                type="radio" 
                                id="template-${template.id}" 
                                name="template" 
                                value="${template.id}"
                                ${formData.template === template.id ? 'checked' : ''}
                                class="template-radio"
                            />
                            <div class="template-icon">
                                ${this.getTemplateIcon(template.icon)}
                            </div>
                            <div class="template-content">
                                <h4 class="template-name">${template.name}</h4>
                                <p class="template-description">${template.description}</p>
                            </div>
                            <div class="template-check">
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="20,6 9,17 4,12"></polyline>
                                </svg>
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderInviteStep() {
        const { formData } = this.state;
        
        return `
            <div class="form-step" data-step="3">
                <div class="form-step-header">
                    <h3 class="form-step-title">Invite Team Members</h3>
                    <p class="form-step-description">Invite your team members to collaborate in this workspace. You can also do this later.</p>
                </div>
                
                <div class="form-group">
                    <label for="invite-emails" class="form-label">Email addresses</label>
                    <div class="email-input-container">
                        <input 
                            type="email" 
                            id="invite-emails" 
                            class="form-input" 
                            placeholder="Enter email addresses separated by commas"
                            data-email-input
                        />
                        <button type="button" class="btn btn--outline btn--sm" data-action="add-email">
                            Add
                        </button>
                    </div>
                    <div class="form-hint">
                        Enter email addresses one at a time or paste multiple addresses separated by commas
                    </div>
                </div>
                
                ${formData.inviteEmails.length > 0 ? `
                    <div class="invited-emails">
                        <h4 class="invited-emails-title">Invited Members (${formData.inviteEmails.length})</h4>
                        <div class="email-tags">
                            ${formData.inviteEmails.map((email, index) => `
                                <div class="email-tag">
                                    <span class="email-tag-text">${email}</span>
                                    <button type="button" class="email-tag-remove" data-action="remove-email" data-index="${index}" aria-label="Remove ${email}">
                                        <svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="form-note">
                    <svg class="form-note-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <p class="form-note-text">
                        Invited members will receive an email invitation to join this workspace. 
                        You can manage member permissions later from the workspace settings.
                    </p>
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
            case 'create-workspace':
                this.handleCreateWorkspace();
                break;
            case 'add-email':
                this.handleAddEmail();
                break;
            case 'remove-email':
                this.handleRemoveEmail(parseInt(event.target.closest('[data-index]').dataset.index));
                break;
        }
    }
    
    handleInput(event) {
        const { name, value } = event.target;
        
        if (name) {
            this.state.formData[name] = value;
            
            // Clear field error on change
            if (this.state.errors[name]) {
                delete this.state.errors[name];
                this.render();
            }
        }
    }
    
    handleChange(event) {
        const { name, value, type, checked } = event.target;
        
        if (name) {
            this.state.formData[name] = type === 'checkbox' ? checked : value;
            this.render();
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
    
    async handleCreateWorkspace() {
        if (this.state.isLoading) return;
        
        if (!this.isFormValid()) return;
        
        this.setState({ isLoading: true, errors: {} });
        
        try {
            const workspace = await workspaceService.createWorkspace(this.state.formData);
            
            // Send invitations if any
            if (this.state.formData.inviteEmails.length > 0) {
                for (const email of this.state.formData.inviteEmails) {
                    try {
                        await workspaceService.inviteMember(workspace.id, { email, role: 'editor' });
                    } catch (error) {
                        console.warn(`Failed to invite ${email}:`, error);
                    }
                }
            }
            
            this.setState({ isLoading: false });
            
            if (this.options.onSuccess) {
                this.options.onSuccess(workspace);
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
        
        // Split by comma and clean up
        const emails = emailValue.split(',').map(email => email.trim()).filter(email => email);
        const validEmails = [];
        
        for (const email of emails) {
            if (this.isValidEmail(email) && !this.state.formData.inviteEmails.includes(email)) {
                validEmails.push(email);
            }
        }
        
        if (validEmails.length > 0) {
            this.state.formData.inviteEmails.push(...validEmails);
            emailInput.value = '';
            this.render();
        }
    }
    
    handleRemoveEmail(index) {
        this.state.formData.inviteEmails.splice(index, 1);
        this.render();
    }
    
    validateCurrentStep() {
        switch (this.state.currentStep) {
            case 1:
                return this.validateField('name') && this.validateField('description');
            case 2:
                return true; // Template is always valid (has default)
            case 3:
                return true; // Invites are optional
            default:
                return false;
        }
    }
    
    validateField(fieldName) {
        const value = this.state.formData[fieldName];
        const rules = this.validationRules[fieldName];
        
        if (!rules) return true;
        
        for (const rule of rules) {
            const isValid = this.validateRule(value, rule);
            if (!isValid) {
                this.setState({
                    errors: {
                        ...this.state.errors,
                        [fieldName]: rule.message
                    }
                });
                return false;
            }
        }
        
        // Clear error if valid
        const errors = { ...this.state.errors };
        delete errors[fieldName];
        this.setState({ errors });
        return true;
    }
    
    validateRule(value, rule) {
        switch (rule.rule) {
            case 'required':
                return value && value.trim().length > 0;
            case 'minLength':
                return value && value.length >= rule.value;
            case 'maxLength':
                return !value || value.length <= rule.value;
            case 'pattern':
                return !value || rule.value.test(value);
            default:
                return true;
        }
    }
    
    isCurrentStepValid() {
        switch (this.state.currentStep) {
            case 1:
                return this.state.formData.name.trim().length >= 2 && Object.keys(this.state.errors).length === 0;
            case 2:
                return true;
            case 3:
                return true;
            default:
                return false;
        }
    }
    
    isFormValid() {
        return this.state.formData.name.trim().length >= 2 && Object.keys(this.state.errors).length === 0;
    }
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    getStepLabel(step) {
        switch (step) {
            case 1: return 'Basic Info';
            case 2: return 'Template';
            case 3: return 'Invite Team';
            default: return '';
        }
    }
    
    getTemplateIcon(iconName) {
        const icons = {
            layout: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>',
            clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>',
            code: '<polyline points="16,18 22,12 16,6"></polyline><polyline points="8,6 2,12 8,18"></polyline>',
            megaphone: '<path d="M3 11l18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>',
            users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
            'trending-up': '<polyline points="23,6 13.5,15.5 8.5,10.5 1,18"></polyline><polyline points="17,6 23,6 23,12"></polyline>'
        };
        
        return `<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">${icons[iconName] || icons.layout}</svg>`;
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