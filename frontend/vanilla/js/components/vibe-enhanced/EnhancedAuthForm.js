/**
 * Enhanced Authentication Form Component
 * Monday.com Vibe-inspired authentication with advanced UX
 */

import { Component } from '../base/Component.js';
import { EnhancedButton } from './EnhancedButton.js';

export class EnhancedAuthForm extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            loading: false,
            error: null,
            success: null,
            formData: {},
            validationErrors: {},
            ...options.initialState
        };
        
        // Form configuration
        this.type = options.type || 'login'; // login, register, forgot-password
        this.onSubmit = options.onSubmit;
        this.onSuccess = options.onSuccess;
        this.onError = options.onError;
        this.showSocialLogin = options.showSocialLogin !== false;
        this.validateOnBlur = options.validateOnBlur !== false;
        this.showPasswordStrength = options.showPasswordStrength !== false;
        
        // Form fields configuration
        this.fields = this.getFieldsForType();
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.setupValidation();
    }
    
    getFieldsForType() {
        const commonFields = {
            email: {
                type: 'email',
                label: 'Email Address',
                placeholder: 'Enter your email',
                required: true,
                icon: 'mail',
                validation: {
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address'
                }
            }
        };
        
        switch (this.type) {
            case 'register':
                return {
                    firstName: {
                        type: 'text',
                        label: 'First Name',
                        placeholder: 'Enter your first name',
                        required: true,
                        icon: 'user',
                        validation: {
                            minLength: 2,
                            message: 'First name must be at least 2 characters'
                        }
                    },
                    lastName: {
                        type: 'text',
                        label: 'Last Name',
                        placeholder: 'Enter your last name',
                        required: true,
                        icon: 'user',
                        validation: {
                            minLength: 2,
                            message: 'Last name must be at least 2 characters'
                        }
                    },
                    ...commonFields,
                    password: {
                        type: 'password',
                        label: 'Password',
                        placeholder: 'Create a strong password',
                        required: true,
                        icon: 'lock',
                        showToggle: true,
                        validation: {
                            minLength: 8,
                            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                            message: 'Password must contain at least 8 characters including uppercase, lowercase, number, and special character'
                        }
                    },
                    confirmPassword: {
                        type: 'password',
                        label: 'Confirm Password',
                        placeholder: 'Confirm your password',
                        required: true,
                        icon: 'lock',
                        showToggle: true,
                        validation: {
                            match: 'password',
                            message: 'Passwords do not match'
                        }
                    }
                };
                
            case 'forgot-password':
                return {
                    ...commonFields
                };
                
            default: // login
                return {
                    ...commonFields,
                    password: {
                        type: 'password',
                        label: 'Password',
                        placeholder: 'Enter your password',
                        required: true,
                        icon: 'lock',
                        showToggle: true,
                        validation: {
                            minLength: 1,
                            message: 'Password is required'
                        }
                    }
                };
        }
    }
    
    render() {
        this.container.innerHTML = `
            <div class="enhanced-auth-form" data-testid="auth-form-${this.type}">
                ${this.renderHeader()}
                ${this.renderSocialLogin()}
                ${this.renderForm()}
                ${this.renderFooter()}
            </div>
        `;
        
        this.setupEnhancedComponents();
    }
    
    renderHeader() {
        const titles = {
            login: 'Welcome Back',
            register: 'Create Your Account',
            'forgot-password': 'Reset Your Password'
        };
        
        const subtitles = {
            login: 'Sign in to continue to your workspace',
            register: 'Join thousands of teams already using our platform',
            'forgot-password': 'Enter your email to receive reset instructions'
        };
        
        return `
            <div class="auth-header">
                <h1 class="auth-title">${titles[this.type]}</h1>
                <p class="auth-subtitle">${subtitles[this.type]}</p>
                ${this.renderStatusMessages()}
            </div>
        `;
    }
    
    renderStatusMessages() {
        return `
            <div class="status-messages">
                ${this.state.error ? `
                    <div class="status-message status-message--error" role="alert">
                        <svg class="status-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <span class="status-text">${this.escapeHtml(this.state.error)}</span>
                    </div>
                ` : ''}
                
                ${this.state.success ? `
                    <div class="status-message status-message--success" role="alert">
                        <svg class="status-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22,4 12,14.01 9,11.01"></polyline>
                        </svg>
                        <span class="status-text">${this.escapeHtml(this.state.success)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderSocialLogin() {
        if (!this.showSocialLogin || this.type === 'forgot-password') return '';
        
        return `
            <div class="social-login">
                <div class="social-buttons">
                    <button type="button" class="social-btn social-btn--google" data-provider="google">
                        <svg class="social-icon" width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Continue with Google</span>
                    </button>
                    
                    <button type="button" class="social-btn social-btn--microsoft" data-provider="microsoft">
                        <svg class="social-icon" width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#f25022" d="M1 1h10v10H1z"/>
                            <path fill="#00a4ef" d="M13 1h10v10H13z"/>
                            <path fill="#7fba00" d="M1 13h10v10H1z"/>
                            <path fill="#ffb900" d="M13 13h10v10H13z"/>
                        </svg>
                        <span>Continue with Microsoft</span>
                    </button>
                </div>
                
                <div class="divider">
                    <span class="divider-text">or</span>
                </div>
            </div>
        `;
    }
    
    renderForm() {
        return `
            <form class="auth-form" data-testid="auth-form" novalidate>
                ${Object.entries(this.fields).map(([key, field]) => this.renderField(key, field)).join('')}
                
                ${this.renderFormActions()}
            </form>
        `;
    }
    
    renderField(key, field) {
        const value = this.state.formData[key] || '';
        const hasError = this.state.validationErrors[key];
        const fieldId = `field-${key}`;
        
        return `
            <div class="form-field ${hasError ? 'form-field--error' : ''}" data-field="${key}">
                <label for="${fieldId}" class="form-label">
                    ${field.label}
                    ${field.required ? '<span class="required-indicator">*</span>' : ''}
                </label>
                
                <div class="form-input-wrapper">
                    ${field.icon ? `
                        <div class="input-icon input-icon--left">
                            ${this.renderIcon(field.icon)}
                        </div>
                    ` : ''}
                    
                    <input
                        type="${field.type}"
                        id="${fieldId}"
                        name="${key}"
                        class="form-input ${field.icon ? 'has-icon' : ''}"
                        placeholder="${field.placeholder}"
                        value="${this.escapeHtml(value)}"
                        ${field.required ? 'required' : ''}
                        ${field.validation?.minLength ? `minlength="${field.validation.minLength}"` : ''}
                        ${field.validation?.maxLength ? `maxlength="${field.validation.maxLength}"` : ''}
                        ${field.validation?.pattern ? `pattern="${field.validation.pattern.source}"` : ''}
                        autocomplete="${this.getAutocomplete(key)}"
                        data-field="${key}"
                    />
                    
                    ${field.showToggle && field.type === 'password' ? `
                        <button type="button" class="input-toggle" data-field="${key}" tabindex="-1">
                            <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                
                ${key === 'password' && this.showPasswordStrength && this.type === 'register' ? this.renderPasswordStrength(value) : ''}
                
                <div class="form-field-feedback">
                    ${hasError ? `
                        <div class="field-error" role="alert">
                            <svg class="error-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            <span class="error-text">${this.escapeHtml(hasError)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderPasswordStrength(password) {
        if (!password) return '';
        
        const strength = this.calculatePasswordStrength(password);
        const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const strengthClasses = ['very-weak', 'weak', 'fair', 'good', 'strong'];
        
        return `
            <div class="password-strength">
                <div class="strength-meter">
                    <div class="strength-bars">
                        ${[1, 2, 3, 4, 5].map(level => `
                            <div class="strength-bar ${level <= strength ? `strength-bar--${strengthClasses[strength - 1]}` : ''}"></div>
                        `).join('')}
                    </div>
                    <span class="strength-label">${strengthLabels[strength - 1]}</span>
                </div>
            </div>
        `;
    }
    
    renderFormActions() {
        const buttonTexts = {
            login: 'Sign In',
            register: 'Create Account',
            'forgot-password': 'Send Reset Link'
        };
        
        return `
            <div class="form-actions">
                <div id="submit-button-container" class="submit-button-container"></div>
                
                ${this.type === 'login' ? `
                    <div class="form-options">
                        <label class="checkbox-wrapper">
                            <input type="checkbox" name="rememberMe" class="checkbox-input">
                            <span class="checkbox-mark"></span>
                            <span class="checkbox-label">Remember me</span>
                        </label>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderFooter() {
        const links = {
            login: [
                { text: "Don't have an account?", linkText: "Sign up", href: "/register" },
                { text: "Forgot your password?", linkText: "Reset it", href: "/forgot-password" }
            ],
            register: [
                { text: "Already have an account?", linkText: "Sign in", href: "/login" }
            ],
            'forgot-password': [
                { text: "Remember your password?", linkText: "Back to sign in", href: "/login" }
            ]
        };
        
        return `
            <div class="auth-footer">
                ${links[this.type].map(link => `
                    <p class="auth-link">
                        ${link.text} <a href="${link.href}" class="link">${link.linkText}</a>
                    </p>
                `).join('')}
            </div>
        `;
    }
    
    setupEnhancedComponents() {
        // Setup enhanced submit button
        const submitContainer = this.container.querySelector('#submit-button-container');
        if (submitContainer) {
            const buttonTexts = {
                login: 'Sign In',
                register: 'Create Account',
                'forgot-password': 'Send Reset Link'
            };
            
            this.submitButton = new EnhancedButton(submitContainer, {
                text: buttonTexts[this.type],
                size: 'large',
                kind: 'primary',
                leftIcon: this.state.loading ? null : 'arrow-right',
                loading: this.state.loading,
                disabled: this.state.loading,
                onClick: this.handleSubmit.bind(this),
                ariaLabel: `${buttonTexts[this.type]} form`
            });
        }
    }
    
    bindEvents() {
        const form = this.container.querySelector('.auth-form');
        if (!form) return;
        
        // Form submission
        form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Field validation on blur
        if (this.validateOnBlur) {
            form.addEventListener('blur', (event) => {
                if (event.target.matches('.form-input')) {
                    this.validateField(event.target.dataset.field, event.target.value);
                }
            }, true);
        }
        
        // Real-time validation on input
        form.addEventListener('input', (event) => {
            if (event.target.matches('.form-input')) {
                const fieldName = event.target.dataset.field;
                this.state.formData[fieldName] = event.target.value;
                
                // Clear error when user starts typing
                if (this.state.validationErrors[fieldName]) {
                    delete this.state.validationErrors[fieldName];
                    this.updateFieldDisplay(fieldName);
                }
                
                // Update password strength in real-time
                if (fieldName === 'password' && this.showPasswordStrength && this.type === 'register') {
                    this.updatePasswordStrength();
                }
            }
        });
        
        // Password toggle
        form.addEventListener('click', (event) => {
            if (event.target.closest('.input-toggle')) {
                const toggle = event.target.closest('.input-toggle');
                const fieldName = toggle.dataset.field;
                const input = form.querySelector(`input[data-field="${fieldName}"]`);
                
                if (input.type === 'password') {
                    input.type = 'text';
                    toggle.setAttribute('aria-label', 'Hide password');
                } else {
                    input.type = 'password';
                    toggle.setAttribute('aria-label', 'Show password');
                }
            }
        });
        
        // Social login
        this.container.addEventListener('click', (event) => {
            if (event.target.closest('.social-btn')) {
                const provider = event.target.closest('.social-btn').dataset.provider;
                this.handleSocialLogin(provider);
            }
        });
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.state.loading) return;
        
        // Validate all fields
        const isValid = this.validateAllFields();
        if (!isValid) return;
        
        this.setState({ loading: true, error: null });
        
        try {
            if (this.onSubmit) {
                await this.onSubmit(this.state.formData);
            }
            
            if (this.onSuccess) {
                this.onSuccess(this.state.formData);
            }
            
        } catch (error) {
            this.setState({ 
                error: error.message || 'An error occurred. Please try again.',
                loading: false 
            });
            
            if (this.onError) {
                this.onError(error);
            }
        }
    }
    
    validateAllFields() {
        let isValid = true;
        const errors = {};
        
        Object.entries(this.fields).forEach(([key, field]) => {
            const value = this.state.formData[key] || '';
            const error = this.validateField(key, value, false);
            if (error) {
                errors[key] = error;
                isValid = false;
            }
        });
        
        this.setState({ validationErrors: errors });
        return isValid;
    }
    
    validateField(fieldName, value, updateDisplay = true) {
        const field = this.fields[fieldName];
        if (!field) return null;
        
        const validation = field.validation;
        if (!validation) return null;
        
        // Required field validation
        if (field.required && (!value || value.trim() === '')) {
            const error = `${field.label} is required`;
            if (updateDisplay) {
                this.setState({ 
                    validationErrors: { ...this.state.validationErrors, [fieldName]: error }
                });
            }
            return error;
        }
        
        if (!value) return null; // Don't validate empty optional fields
        
        // Length validation
        if (validation.minLength && value.length < validation.minLength) {
            return validation.message || `${field.label} must be at least ${validation.minLength} characters`;
        }
        
        if (validation.maxLength && value.length > validation.maxLength) {
            return validation.message || `${field.label} must be no more than ${validation.maxLength} characters`;
        }
        
        // Pattern validation
        if (validation.pattern && !validation.pattern.test(value)) {
            return validation.message || `${field.label} format is invalid`;
        }
        
        // Match validation (for confirm password)
        if (validation.match) {
            const matchValue = this.state.formData[validation.match];
            if (value !== matchValue) {
                return validation.message || `${field.label} does not match`;
            }
        }
        
        // Clear error if validation passes
        if (updateDisplay && this.state.validationErrors[fieldName]) {
            const newErrors = { ...this.state.validationErrors };
            delete newErrors[fieldName];
            this.setState({ validationErrors: newErrors });
        }
        
        return null;
    }
    
    // Helper methods continue...
    calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[@$!%*?&]/.test(password)) score++;
        
        return Math.max(1, score);
    }
    
    updatePasswordStrength() {
        const passwordField = this.container.querySelector('[data-field="password"]');
        if (passwordField) {
            const strengthContainer = passwordField.closest('.form-field').querySelector('.password-strength');
            if (strengthContainer) {
                const password = passwordField.value;
                strengthContainer.outerHTML = this.renderPasswordStrength(password);
            }
        }
    }
    
    updateFieldDisplay(fieldName) {
        const fieldElement = this.container.querySelector(`[data-field="${fieldName}"]`);
        if (fieldElement) {
            const hasError = this.state.validationErrors[fieldName];
            fieldElement.classList.toggle('form-field--error', !!hasError);
            
            const feedback = fieldElement.querySelector('.form-field-feedback');
            if (feedback) {
                feedback.innerHTML = hasError ? `
                    <div class="field-error" role="alert">
                        <svg class="error-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <span class="error-text">${this.escapeHtml(hasError)}</span>
                    </div>
                ` : '';
            }
        }
    }
    
    handleSocialLogin(provider) {
        console.log('Social login with:', provider);
        // Implement social login logic
        eventBus.emit('auth:social-login', { provider });
    }
    
    getAutocomplete(fieldName) {
        const autocompleteMap = {
            email: 'email',
            password: 'current-password',
            firstName: 'given-name',
            lastName: 'family-name',
            confirmPassword: 'new-password'
        };
        
        return autocompleteMap[fieldName] || 'off';
    }
    
    renderIcon(iconName) {
        const icons = {
            mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
            user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
            lock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><circle cx="12" cy="16" r="1"></circle><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
            'arrow-right': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12,5 19,12 12,19"></polyline></svg>'
        };
        
        return icons[iconName] || iconName;
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        
        // Update status messages
        const statusContainer = this.container.querySelector('.status-messages');
        if (statusContainer) {
            statusContainer.innerHTML = this.renderStatusMessages().match(/<div class="status-messages">(.*?)<\/div>/s)?.[1] || '';
        }
        
        // Update submit button
        if (this.submitButton) {
            this.submitButton.setLoading(this.state.loading);
            this.submitButton.setDisabled(this.state.loading);
        }
    }
    
    // Public API methods
    setError(error) {
        this.setState({ error, loading: false });
    }
    
    setSuccess(success) {
        this.setState({ success, loading: false });
    }
    
    setLoading(loading) {
        this.setState({ loading });
    }
    
    getFormData() {
        return { ...this.state.formData };
    }
    
    resetForm() {
        this.setState({ 
            formData: {}, 
            validationErrors: {}, 
            error: null, 
            success: null, 
            loading: false 
        });
        
        const form = this.container.querySelector('.auth-form');
        if (form) {
            form.reset();
        }
    }
    
    destroy() {
        if (this.submitButton) {
            this.submitButton.destroy();
        }
        
        super.destroy();
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, (m) => map[m]);
    }
}