/**
 * Board Create Dialog Component
 */

import { Component } from '../base/Component.js';
import { boardService } from '../../services/board.js';
import { workspaceService } from '../../services/workspace.js';
import { eventBus } from '../../utils/events.js';

export class BoardCreateDialog extends Component {
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
                icon: '📋',
                isPrivate: false,
                columns: [],
                inviteMembers: false,
                memberEmails: []
            }
        };
        
        this.validationRules = {
            name: [
                { rule: 'required', message: 'Board name is required' },
                { rule: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
                { rule: 'maxLength', value: 100, message: 'Name must be less than 100 characters' }
            ],
            description: [
                { rule: 'maxLength', value: 500, message: 'Description must be less than 500 characters' }
            ]
        };
        
        this.boardIcons = [
            '📋', '📊', '📈', '📅', '🎯', '⭐', '🔥', '💡', '🚀', '📝',
            '📌', '🎨', '🛠️', '⚡', '🔧', '📱', '💻', '🏆', '🎉', '💎'
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
            <div class="dialog-content board-create-dialog" role="dialog" aria-labelledby="dialog-title" aria-modal="true">
                <div class="dialog-header">
                    <h2 id="dialog-title" class="dialog-title">Create New Board</h2>
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
                            <button type="button" class="btn btn--primary" data-action="create-board" ${isLoading || !this.isFormValid() ? 'disabled' : ''}>
                                ${isLoading ? `
                                    <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
                                        <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    Creating Board...
                                ` : `
                                    Create Board
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
                return this.renderCustomizeStep();
            default:
                return '';
        }
    }
    
    renderBasicInfoStep() {
        const { formData, errors } = this.state;
        const currentWorkspace = workspaceService.getCurrentWorkspace();
        
        return `
            <div class="form-step" data-step="1">
                <div class="form-step-header">
                    <h3 class="form-step-title">Basic Information</h3>
                    <p class="form-step-description">Give your board a name and description to help your team understand its purpose.</p>
                </div>
                
                <div class="form-group">
                    <label for="board-name" class="form-label">Board Name *</label>
                    <input 
                        type="text" 
                        id="board-name" 
                        name="name" 
                        class="form-input ${errors.name ? 'form-input--error' : ''}"
                        placeholder="e.g. Product Roadmap, Sprint Planning"
                        value="${formData.name}"
                        maxlength="100"
                        required
                        autofocus
                    />
                    ${errors.name ? `<span class="form-error">${errors.name}</span>` : ''}
                    <div class="form-hint">
                        <span class="form-counter">${formData.name.length}/100</span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="board-description" class="form-label">Description</label>
                    <textarea 
                        id="board-description" 
                        name="description" 
                        class="form-textarea ${errors.description ? 'form-input--error' : ''}"
                        placeholder="Optional: Describe what this board is for..."
                        rows="3"
                        maxlength="500"
                    >${formData.description}</textarea>
                    ${errors.description ? `<span class="form-error">${errors.description}</span>` : ''}
                    <div class="form-hint">
                        <span class="form-counter">${formData.description.length}/500</span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Board Icon</label>
                    <div class="icon-picker">
                        ${this.boardIcons.map(icon => `
                            <button 
                                type="button" 
                                class="icon-option ${icon === formData.icon ? 'icon-option--selected' : ''}" 
                                data-action="select-icon" 
                                data-icon="${icon}"
                                title="Select ${icon}"
                            >
                                ${icon}
                            </button>
                        `).join('')}
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
                            <span class="checkbox-text">Make this board private</span>
                            <span class="checkbox-description">Only invited members can access this board</span>
                        </span>
                    </label>
                </div>
                
                ${currentWorkspace ? `
                    <div class="workspace-info">
                        <div class="workspace-info-icon">
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <div class="workspace-info-content">
                            <span class="workspace-info-label">Board will be created in:</span>
                            <span class="workspace-info-name">${currentWorkspace.name}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderTemplateStep() {
        const { formData } = this.state;
        const templates = boardService.getBoardTemplates();
        
        return `
            <div class="form-step" data-step="2">
                <div class="form-step-header">
                    <h3 class="form-step-title">Choose a Template</h3>
                    <p class="form-step-description">Select a template to get started quickly with pre-configured columns, or choose blank to start from scratch.</p>
                </div>
                
                <div class="template-grid">
                    ${templates.map(template => `
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
                            <div class="template-preview">
                                <div class="template-preview-title">Columns:</div>
                                <div class="template-columns">
                                    ${template.columns.slice(0, 4).map(column => `
                                        <span class="template-column">${column.name}</span>
                                    `).join('')}
                                    ${template.columns.length > 4 ? `<span class="template-column-more">+${template.columns.length - 4} more</span>` : ''}
                                </div>
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
    
    renderCustomizeStep() {
        const { formData } = this.state;
        const templates = boardService.getBoardTemplates();
        const selectedTemplate = templates.find(t => t.id === formData.template);
        
        return `
            <div class="form-step" data-step="3">
                <div class="form-step-header">
                    <h3 class="form-step-title">Customize Board</h3>
                    <p class="form-step-description">Review and customize your board columns, and optionally invite team members.</p>
                </div>
                
                <div class="board-preview">
                    <div class="board-preview-header">
                        <div class="board-preview-icon">${formData.icon}</div>
                        <div class="board-preview-info">
                            <h4 class="board-preview-name">${formData.name || 'Untitled Board'}</h4>
                            ${formData.description ? `<p class="board-preview-description">${formData.description}</p>` : ''}
                        </div>
                    </div>
                    
                    <div class="board-preview-template">
                        <div class="template-info">
                            <span class="template-badge">${selectedTemplate ? selectedTemplate.name : 'Blank'}</span>
                            ${formData.isPrivate ? '<span class="privacy-badge">Private</span>' : ''}
                        </div>
                    </div>
                </div>
                
                ${selectedTemplate && selectedTemplate.columns ? `
                    <div class="column-customization">
                        <h4 class="customization-title">Board Columns</h4>
                        <p class="customization-description">These columns will be created with your board. You can modify them later.</p>
                        
                        <div class="column-list">
                            ${selectedTemplate.columns.map((column, index) => `
                                <div class="column-item">
                                    <div class="column-info">
                                        <div class="column-name">${column.name}</div>
                                        <div class="column-type">${this.formatColumnType(column.type)}</div>
                                    </div>
                                    <div class="column-type-icon">
                                        ${this.getColumnTypeIcon(column.type)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="member-invitation">
                    <label class="checkbox-label">
                        <input 
                            type="checkbox" 
                            name="inviteMembers" 
                            ${formData.inviteMembers ? 'checked' : ''}
                            data-invite-members-checkbox
                        />
                        <span class="checkbox-checkmark"></span>
                        <span class="checkbox-content">
                            <span class="checkbox-text">Invite team members to this board</span>
                            <span class="checkbox-description">Send invitations after the board is created</span>
                        </span>
                    </label>
                    
                    ${formData.inviteMembers ? `
                        <div class="member-invite-section">
                            <label for="member-emails" class="form-label">Email addresses</label>
                            <div class="email-input-container">
                                <input 
                                    type="email" 
                                    id="member-emails" 
                                    class="form-input" 
                                    placeholder="Enter email addresses separated by commas"
                                    data-email-input
                                />
                                <button type="button" class="btn btn--outline btn--sm" data-action="add-email">
                                    Add
                                </button>
                            </div>
                            
                            ${formData.memberEmails.length > 0 ? `
                                <div class="email-tags">
                                    ${formData.memberEmails.map((email, index) => `
                                        <div class="email-tag">
                                            <span class="email-tag-text">${email}</span>
                                            <button type="button" class="email-tag-remove" data-action="remove-email" data-index="${index}">
                                                <svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <div class="creation-summary">
                    <h4 class="summary-title">
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Summary
                    </h4>
                    <div class="summary-items">
                        <div class="summary-item">
                            <span class="summary-label">Board name:</span>
                            <span class="summary-value">${formData.name || 'Untitled Board'}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Template:</span>
                            <span class="summary-value">${selectedTemplate ? selectedTemplate.name : 'Blank'}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Columns:</span>
                            <span class="summary-value">${selectedTemplate ? selectedTemplate.columns.length : 0}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Privacy:</span>
                            <span class="summary-value">${formData.isPrivate ? 'Private' : 'Workspace members'}</span>
                        </div>
                        ${formData.inviteMembers ? `
                            <div class="summary-item">
                                <span class="summary-label">Invitations:</span>
                                <span class="summary-value">${formData.memberEmails.length} member${formData.memberEmails.length !== 1 ? 's' : ''}</span>
                            </div>
                        ` : ''}
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
            case 'create-board':
                this.handleCreateBoard();
                break;
            case 'select-icon':
                this.handleSelectIcon(event.target.dataset.icon);
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
            
            // Update columns when template changes
            if (name === 'template') {
                this.updateTemplateColumns(value);
            }
            
            this.render();
        } else if (event.target.dataset.inviteMembersCheckbox !== undefined) {
            this.state.formData.inviteMembers = event.target.checked;
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
    
    async handleCreateBoard() {
        if (this.state.isLoading || !this.isFormValid()) return;
        
        this.setState({ isLoading: true, errors: {} });
        
        try {
            const boardData = {
                name: this.state.formData.name,
                description: this.state.formData.description,
                icon: this.state.formData.icon,
                isPrivate: this.state.formData.isPrivate,
                template: this.state.formData.template,
                columns: this.state.formData.columns
            };
            
            const board = await boardService.createBoard(boardData);
            
            // Send invitations if any
            if (this.state.formData.inviteMembers && this.state.formData.memberEmails.length > 0) {
                // Note: This would typically be handled by a separate invitation service
                // For now, we'll emit an event that can be handled by the parent component
                eventBus.emit('board:invite_members', { 
                    boardId: board.id, 
                    emails: this.state.formData.memberEmails 
                });
            }
            
            this.setState({ isLoading: false });
            
            if (this.options.onSuccess) {
                this.options.onSuccess(board);
            }
            
            this.handleClose();
        } catch (error) {
            this.setState({
                isLoading: false,
                errors: { submit: error.message }
            });
        }
    }
    
    handleSelectIcon(icon) {
        this.state.formData.icon = icon;
        this.render();
    }
    
    handleAddEmail() {
        const emailInput = this.container.querySelector('[data-email-input]');
        const emailValue = emailInput.value.trim();
        
        if (!emailValue) return;
        
        // Split by comma and clean up
        const emails = emailValue.split(',').map(email => email.trim()).filter(email => email);
        const validEmails = [];
        
        for (const email of emails) {
            if (this.isValidEmail(email) && !this.state.formData.memberEmails.includes(email)) {
                validEmails.push(email);
            }
        }
        
        if (validEmails.length > 0) {
            this.state.formData.memberEmails.push(...validEmails);
            emailInput.value = '';
            this.render();
        }
    }
    
    handleRemoveEmail(index) {
        this.state.formData.memberEmails.splice(index, 1);
        this.render();
    }
    
    updateTemplateColumns(templateId) {
        const templates = boardService.getBoardTemplates();
        const template = templates.find(t => t.id === templateId);
        
        if (template && template.columns) {
            this.state.formData.columns = [...template.columns];
        } else {
            this.state.formData.columns = [];
        }
    }
    
    validateCurrentStep() {
        switch (this.state.currentStep) {
            case 1:
                return this.validateField('name') && this.validateField('description');
            case 2:
                return true; // Template is always valid (has default)
            case 3:
                return true; // Customization is optional
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
            case 3: return 'Customize';
            default: return '';
        }
    }
    
    getTemplateIcon(iconName) {
        const icons = {
            layout: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>',
            columns: '<rect x="3" y="3" width="6" height="18" rx="2"></rect><rect x="11" y="3" width="4" height="18" rx="2"></rect><rect x="17" y="3" width="4" height="18" rx="2"></rect>',
            clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>',
            zap: '<polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon>',
            bug: '<path d="M8 2v4"></path><path d="M16 2v4"></path><path d="M21 12h-1"></path><path d="M4 12h-1"></path><path d="M18.5 7.5 20 6"></path><path d="M3.5 7.5 2 6"></path><path d="M18.5 16.5 20 18"></path><path d="M3.5 16.5 2 18"></path><path d="M12 22c-6 0-10-4-10-10s4-10 10-10 10 4 10 10-4 10-10 10z"></path>',
            calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>'
        };
        
        return `<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">${icons[iconName] || icons.layout}</svg>`;
    }
    
    getColumnTypeIcon(type) {
        const icons = {
            text: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline>',
            status: '<circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path>',
            priority: '<polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon>',
            person: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
            date: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
            number: '<line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line>'
        };
        
        return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">${icons[type] || icons.text}</svg>`;
    }
    
    formatColumnType(type) {
        const typeLabels = {
            text: 'Text',
            status: 'Status',
            priority: 'Priority',
            person: 'Person',
            date: 'Date',
            number: 'Number'
        };
        
        return typeLabels[type] || 'Text';
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