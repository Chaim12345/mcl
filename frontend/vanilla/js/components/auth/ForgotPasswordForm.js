/**
 * Forgot Password Form Component
 */

import { Component } from '../base/Component.js';
import { authService } from '../../services/auth.js';
import { eventBus } from '../../utils/events.js';

export class ForgotPasswordForm extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            emailSent: false,
            userEmail: '',
            resendCount: 0,
            errors: {},
            formData: {
                email: ''
            }
        };
        
        this.validationRules = {
            email: [
                { rule: 'required', message: 'Email is required' },
                { rule: 'email', message: 'Please enter a valid email address' },
                { rule: 'maxLength', value: 255, message: 'Email must be less than 255 characters' }
            ]
        };
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.focusFirstInput();
    }
    
    render() {
        if (this.state.emailSent) {
            this.renderEmailSent();
        } else {
            this.renderForgotPasswordForm();
        }
    }
    
    renderEmailSent() {
        const { isLoading, userEmail, resendCount } = this.state;
        
        this.container.innerHTML = `
            <div class="auth-card">
                <div class="auth-header text-center">
                    <div class="email-sent-icon">
                        <svg class="icon-large text-success" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                    </div>
                    <h1 class="auth-title">Check your email</h1>
                    <p class="auth-description">
                        We've sent password reset instructions to 
                        <span class="font-medium">${userEmail}</span>
                    </p>
                </div>
                
                <div class="email-sent-content">
                    <div class="alert alert--success">
                        <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        <p>Click the reset link in your email to create a new password. The link will expire in 1 hour.</p>
                    </div>
                    
                    <div class="email-help">
                        <p class="text-muted">Didn't receive the email?</p>
                        <ul class="help-list">
                            <li>Check your spam or junk folder</li>
                            <li>Make sure you entered the correct email address</li>
                            <li>Wait a few minutes for the email to arrive</li>
                        </ul>
                    </div>
                    
                    ${resendCount < 3 ? `
                        <button 
                            type="button" 
                            class="btn btn--outline btn--full-width" 
                            data-resend-email
                            ${isLoading ? 'disabled' : ''}
                        >
                            ${isLoading ? `
                                <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
                                    <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Sending...
                            ` : `
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                Resend reset email
                            `}
                        </button>
                    ` : `
                        <div class="alert alert--warning">
                            <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <p>You've reached the maximum number of resend attempts. Please try again later or contact support if you continue to have issues.</p>
                        </div>
                    `}
                </div>
                
                <div class="auth-footer">
                    <button type="button" class="btn btn--outline btn--full-width" data-try-different-email>
                        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="15,18 9,12 15,6"></polyline>
                        </svg>
                        Try different email
                    </button>
                    
                    <div class="auth-footer-links">
                        <p class="auth-footer-text">
                            Remember your password? 
                            <a href="/login.html" class="form-link">Back to Sign In</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderForgotPasswordForm() {
        const { isLoading, errors } = this.state;
        
        this.container.innerHTML = `
            <div class="auth-card">
                <div class="auth-header">
                    <h1 class="auth-title">Reset your password</h1>
                    <p class="auth-description">
                        Enter your email address and we'll send you a link to reset your password
                    </p>
                </div>
                
                <form class="auth-form" novalidate>
                    <div class="form-group">
                        <label for="email" class="form-label">Email address</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            class="form-input ${errors.email ? 'form-input--error' : ''}"
                            placeholder="Enter your email address"
                            autocomplete="email"
                            ${isLoading ? 'disabled' : ''}
                            required
                        />
                        ${errors.email ? `<span class="form-error" id="email-error">${errors.email}</span>` : ''}
                    </div>
                    
                    ${errors.submit ? `
                        <div class="alert alert--error">
                            <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            <p>${errors.submit}</p>
                        </div>
                    ` : ''}
                    
                    <button 
                        type="submit" 
                        class="btn btn--primary btn--full-width"
                        ${isLoading || !this.isFormValid() ? 'disabled' : ''}
                    >
                        ${isLoading ? `
                            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
                                <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Sending reset email...
                        ` : `
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            Send reset email
                        `}
                    </button>
                    
                    <div class="auth-footer">
                        <div class="auth-footer-links">
                            <p class="auth-footer-text">
                                Remember your password? 
                                <a href="/login.html" class="form-link" ${isLoading ? 'tabindex="-1"' : ''}>
                                    Back to Sign In
                                </a>
                            </p>
                            <p class="auth-footer-text">
                                Don't have an account? 
                                <a href="/register.html" class="form-link" ${isLoading ? 'tabindex="-1"' : ''}>
                                    Sign up
                                </a>
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }
    
    bindEvents() {
        if (this.state.emailSent) {
            this.bindEmailSentEvents();
        } else {
            this.bindFormEvents();
        }
    }
    
    bindEmailSentEvents() {
        const resendBtn = this.container.querySelector('[data-resend-email]');
        const tryDifferentBtn = this.container.querySelector('[data-try-different-email]');
        
        if (resendBtn) {
            resendBtn.addEventListener('click', this.handleResendEmail.bind(this));
        }
        
        if (tryDifferentBtn) {
            tryDifferentBtn.addEventListener('click', this.handleTryDifferentEmail.bind(this));
        }
    }
    
    bindFormEvents() {
        const form = this.container.querySelector('.auth-form');
        const emailInput = this.container.querySelector('#email');
        
        // Form submission
        form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Input changes
        emailInput.addEventListener('input', this.handleInputChange.bind(this));
        emailInput.addEventListener('blur', this.handleInputBlur.bind(this));
        
        // Keyboard shortcuts
        form.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    handleSubmit(event) {
        event.preventDefault();
        
        if (this.state.isLoading) return;
        
        this.validateForm();
        
        if (this.isFormValid()) {
            this.submitForm();
        }
    }
    
    async submitForm() {
        const { email } = this.state.formData;
        
        this.setState({ isLoading: true, errors: {} });
        
        try {
            await authService.forgotPassword(email);
            
            this.setState({
                isLoading: false,
                emailSent: true,
                userEmail: email,
                resendCount: 0
            });
        } catch (error) {
            this.setState({ 
                isLoading: false,
                errors: { 
                    submit: error.message || 'Failed to send reset email. Please try again.' 
                }
            });
            this.render();
        }
    }
    
    handleInputChange(event) {
        const { name, value } = event.target;
        
        this.state.formData[name] = value;
        
        // Clear field error on change
        if (this.state.errors[name]) {
            delete this.state.errors[name];
            this.render();
        }
    }
    
    handleInputBlur(event) {
        const { name } = event.target;
        this.validateField(name);
        this.render();
    }
    
    handleKeyDown(event) {
        // Submit on Ctrl+Enter
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            this.handleSubmit(event);
        }
    }
    
    async handleResendEmail() {
        if (this.state.isLoading || this.state.resendCount >= 3) return;
        
        this.setState({ isLoading: true });
        
        try {
            await authService.forgotPassword(this.state.userEmail);
            
            this.setState({
                isLoading: false,
                resendCount: this.state.resendCount + 1
            });
            
            this.render();
        } catch (error) {
            this.setState({ isLoading: false });
            this.render();
        }
    }
    
    handleTryDifferentEmail() {
        this.setState({
            emailSent: false,
            userEmail: '',
            resendCount: 0,
            errors: {},
            formData: { email: '' }
        });
        
        // Focus email input after render
        setTimeout(() => {
            this.focusFirstInput();
        }, 100);
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
    
    validateForm() {
        for (const fieldName in this.validationRules) {
            this.validateField(fieldName);
        }
        
        return Object.keys(this.state.errors).length === 0;
    }
    
    validateRule(value, rule) {
        switch (rule.rule) {
            case 'required':
                return value && value.trim().length > 0;
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'maxLength':
                return !value || value.length <= rule.value;
            default:
                return true;
        }
    }
    
    isFormValid() {
        return Object.keys(this.state.errors).length === 0 &&
               this.state.formData.email.trim();
    }
    
    focusFirstInput() {
        if (!this.state.emailSent) {
            setTimeout(() => {
                const emailInput = this.container.querySelector('#email');
                if (emailInput) {
                    emailInput.focus();
                }
            }, 100);
        }
    }
    
    // Set email from URL parameter or external source
    setEmail(email) {
        this.state.formData.email = email;
        
        const emailInput = this.container.querySelector('#email');
        if (emailInput) {
            emailInput.value = email;
        }
    }
    
    // Clear form
    clearForm() {
        this.state.formData = { email: '' };
        this.state.errors = {};
        this.setState({ 
            isLoading: false, 
            emailSent: false, 
            userEmail: '', 
            resendCount: 0 
        });
        
        const form = this.container.querySelector('.auth-form');
        if (form) {
            form.reset();
        }
    }
    
    destroy() {
        super.destroy();
    }
} 