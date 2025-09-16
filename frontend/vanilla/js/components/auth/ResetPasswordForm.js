/**
 * Reset Password Form Component
 */

import { Component } from '../base/Component.js';
import { authService } from '../../services/auth.js';
import { eventBus } from '../../utils/events.js';

export class ResetPasswordForm extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            showPassword: false,
            showConfirmPassword: false,
            resetToken: '',
            resetComplete: false,
            tokenValid: null, // null = checking, true = valid, false = invalid
            errors: {},
            formData: {
                password: '',
                confirmPassword: ''
            }
        };
        
        this.validationRules = {
            password: [
                { rule: 'required', message: 'Password is required' },
                { rule: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
                { rule: 'maxLength', value: 128, message: 'Password must be less than 128 characters' },
                { rule: 'strongPassword', message: 'Password must contain at least one uppercase letter, lowercase letter, number, and special character' }
            ],
            confirmPassword: [
                { rule: 'required', message: 'Please confirm your password' },
                { rule: 'matches', field: 'password', message: 'Passwords don\'t match' }
            ]
        };
        
        this.init();
    }
    
    init() {
        // Extract reset token from URL
        this.extractResetToken();
        this.render();
        this.bindEvents();
        
        // Validate token if present
        if (this.state.resetToken) {
            this.validateToken();
        } else {
            this.setState({ tokenValid: false });
        }
    }
    
    extractResetToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            this.setState({ resetToken: token });
        }
    }
    
    async validateToken() {
        // For now, we'll assume the token is valid if it exists
        // In a real implementation, you'd validate with the server
        if (this.state.resetToken) {
            this.setState({ tokenValid: true });
            this.focusFirstInput();
        } else {
            this.setState({ tokenValid: false });
        }
        this.render();
    }
    
    render() {
        if (this.state.tokenValid === null) {
            this.renderTokenValidation();
        } else if (this.state.tokenValid === false) {
            this.renderInvalidToken();
        } else if (this.state.resetComplete) {
            this.renderResetComplete();
        } else {
            this.renderResetPasswordForm();
        }
    }
    
    renderTokenValidation() {
        this.container.innerHTML = `
            <div class="auth-card">
                <div class="auth-header text-center">
                    <div class="loading-icon">
                        <svg class="spinner icon-large" width="48" height="48" viewBox="0 0 24 24">
                            <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <h1 class="auth-title">Validating reset link</h1>
                    <p class="auth-description">Please wait while we verify your password reset token...</p>
                </div>
            </div>
        `;
    }
    
    renderInvalidToken() {
        this.container.innerHTML = `
            <div class="auth-card">
                <div class="auth-header text-center">
                    <div class="error-icon">
                        <svg class="icon-large text-error" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <h1 class="auth-title">Invalid reset link</h1>
                    <p class="auth-description">
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                </div>
                
                <div class="invalid-token-content">
                    <div class="alert alert--error">
                        <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div>
                            <p><strong>Possible reasons:</strong></p>
                            <ul>
                                <li>The link has expired (links are valid for 1 hour)</li>
                                <li>The link has already been used</li>
                                <li>The link was copied incorrectly</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="auth-footer">
                    <a href="/forgot-password.html" class="btn btn--primary btn--full-width">
                        Request new reset link
                    </a>
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
    
    renderResetComplete() {
        this.container.innerHTML = `
            <div class="auth-card">
                <div class="auth-header text-center">
                    <div class="success-icon">
                        <svg class="icon-large text-success" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                    </div>
                    <h1 class="auth-title">Password reset successful</h1>
                    <p class="auth-description">
                        Your password has been updated successfully. You can now sign in with your new password.
                    </p>
                </div>
                
                <div class="reset-complete-content">
                    <div class="alert alert--success">
                        <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        <p>Your account is now secure with your new password. Remember to keep it safe!</p>
                    </div>
                </div>
                
                <div class="auth-footer">
                    <a href="/login.html" class="btn btn--primary btn--full-width">
                        Continue to Sign In
                    </a>
                </div>
            </div>
        `;
    }
    
    renderResetPasswordForm() {
        const { isLoading, showPassword, showConfirmPassword, errors } = this.state;
        const passwordStrength = this.calculatePasswordStrength(this.state.formData.password);
        
        this.container.innerHTML = `
            <div class="auth-card">
                <div class="auth-header">
                    <h1 class="auth-title">Create new password</h1>
                    <p class="auth-description">
                        Enter a strong new password for your account
                    </p>
                </div>
                
                <form class="auth-form" novalidate>
                    <div class="form-group">
                        <label for="password" class="form-label">New password</label>
                        <div class="form-input-wrapper">
                            <input 
                                type="${showPassword ? 'text' : 'password'}" 
                                id="password" 
                                name="password" 
                                class="form-input form-input--with-icon ${errors.password ? 'form-input--error' : ''}"
                                placeholder="Create a strong password"
                                autocomplete="new-password"
                                ${isLoading ? 'disabled' : ''}
                                required
                            />
                            <button 
                                type="button" 
                                class="form-input-icon" 
                                data-toggle-password="password"
                                aria-label="${showPassword ? 'Hide password' : 'Show password'}"
                                ${isLoading ? 'disabled' : ''}
                            >
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    ${showPassword ? 
                                        '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>' :
                                        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
                                    }
                                </svg>
                            </button>
                        </div>
                        
                        ${this.state.formData.password ? `
                            <div class="password-strength">
                                <div class="password-strength-header">
                                    <span class="text-muted">Password strength:</span>
                                    <span class="password-strength-label password-strength-label--${passwordStrength.level}">
                                        ${passwordStrength.label}
                                    </span>
                                </div>
                                <div class="password-strength-bar">
                                    <div class="password-strength-fill password-strength-fill--${passwordStrength.level}" 
                                         style="width: ${passwordStrength.score}%"></div>
                                </div>
                                <div class="password-requirements">
                                    <div class="requirement ${this.checkRequirement('length')}">
                                        <svg class="requirement-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <polyline points="20,6 9,17 4,12"></polyline>
                                        </svg>
                                        At least 8 characters
                                    </div>
                                    <div class="requirement ${this.checkRequirement('uppercase')}">
                                        <svg class="requirement-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <polyline points="20,6 9,17 4,12"></polyline>
                                        </svg>
                                        One uppercase letter
                                    </div>
                                    <div class="requirement ${this.checkRequirement('lowercase')}">
                                        <svg class="requirement-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <polyline points="20,6 9,17 4,12"></polyline>
                                        </svg>
                                        One lowercase letter
                                    </div>
                                    <div class="requirement ${this.checkRequirement('number')}">
                                        <svg class="requirement-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <polyline points="20,6 9,17 4,12"></polyline>
                                        </svg>
                                        One number
                                    </div>
                                    <div class="requirement ${this.checkRequirement('special')}">
                                        <svg class="requirement-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <polyline points="20,6 9,17 4,12"></polyline>
                                        </svg>
                                        One special character
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${errors.password ? `<span class="form-error">${errors.password}</span>` : ''}
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword" class="form-label">Confirm password</label>
                        <div class="form-input-wrapper">
                            <input 
                                type="${showConfirmPassword ? 'text' : 'password'}" 
                                id="confirmPassword" 
                                name="confirmPassword" 
                                class="form-input form-input--with-icon ${errors.confirmPassword ? 'form-input--error' : ''}"
                                placeholder="Confirm your new password"
                                autocomplete="new-password"
                                ${isLoading ? 'disabled' : ''}
                                required
                            />
                            <button 
                                type="button" 
                                class="form-input-icon" 
                                data-toggle-password="confirmPassword"
                                aria-label="${showConfirmPassword ? 'Hide password' : 'Show password'}"
                                ${isLoading ? 'disabled' : ''}
                            >
                                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    ${showConfirmPassword ? 
                                        '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>' :
                                        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
                                    }
                                </svg>
                            </button>
                        </div>
                        ${errors.confirmPassword ? `<span class="form-error">${errors.confirmPassword}</span>` : ''}
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
                            Updating password...
                        ` : 'Update password'}
                    </button>
                    
                    <div class="auth-footer">
                        <div class="auth-footer-links">
                            <p class="auth-footer-text">
                                Remember your password? 
                                <a href="/login.html" class="form-link" ${isLoading ? 'tabindex="-1"' : ''}>
                                    Back to Sign In
                                </a>
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }
    
    bindEvents() {
        if (this.state.tokenValid === true && !this.state.resetComplete) {
            this.bindFormEvents();
        }
    }
    
    bindFormEvents() {
        const form = this.container.querySelector('.auth-form');
        const inputs = this.container.querySelectorAll('input');
        const togglePasswordBtns = this.container.querySelectorAll('[data-toggle-password]');
        
        if (!form) return;
        
        // Form submission
        form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Input changes
        inputs.forEach(input => {
            input.addEventListener('input', this.handleInputChange.bind(this));
            input.addEventListener('blur', this.handleInputBlur.bind(this));
        });
        
        // Password visibility toggles
        togglePasswordBtns.forEach(btn => {
            btn.addEventListener('click', this.handleTogglePassword.bind(this));
        });
        
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
        const { password } = this.state.formData;
        const { resetToken } = this.state;
        
        this.setState({ isLoading: true, errors: {} });
        
        try {
            await authService.resetPassword(resetToken, password);
            
            this.setState({
                isLoading: false,
                resetComplete: true
            });
        } catch (error) {
            this.setState({ 
                isLoading: false,
                errors: { 
                    submit: error.message || 'Password reset failed. Please try again.' 
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
        }
        
        // Re-render for password strength indicator
        if (name === 'password' || name === 'confirmPassword') {
            this.render();
        }
    }
    
    handleInputBlur(event) {
        const { name } = event.target;
        this.validateField(name);
        this.render();
    }
    
    handleTogglePassword(event) {
        const field = event.currentTarget.dataset.togglePassword;
        
        if (field === 'password') {
            this.setState({ showPassword: !this.state.showPassword });
        } else if (field === 'confirmPassword') {
            this.setState({ showConfirmPassword: !this.state.showConfirmPassword });
        }
    }
    
    handleKeyDown(event) {
        // Submit on Ctrl+Enter
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            this.handleSubmit(event);
        }
    }
    
    calculatePasswordStrength(password) {
        if (!password) return { score: 0, level: 'weak', label: 'Weak' };
        
        let score = 0;
        
        // Length checks
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        
        // Character variety checks
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        
        // No repeated characters
        if (!/(.)\1{2,}/.test(password)) score += 1;
        
        const percentage = (score / 7) * 100;
        
        if (score <= 2) return { score: percentage, level: 'weak', label: 'Weak' };
        if (score <= 4) return { score: percentage, level: 'fair', label: 'Fair' };
        if (score <= 5) return { score: percentage, level: 'good', label: 'Good' };
        return { score: percentage, level: 'strong', label: 'Strong' };
    }
    
    checkRequirement(type) {
        const password = this.state.formData.password;
        if (!password) return 'requirement--pending';
        
        switch (type) {
            case 'length':
                return password.length >= 8 ? 'requirement--met' : 'requirement--pending';
            case 'uppercase':
                return /[A-Z]/.test(password) ? 'requirement--met' : 'requirement--pending';
            case 'lowercase':
                return /[a-z]/.test(password) ? 'requirement--met' : 'requirement--pending';
            case 'number':
                return /[0-9]/.test(password) ? 'requirement--met' : 'requirement--pending';
            case 'special':
                return /[^A-Za-z0-9]/.test(password) ? 'requirement--met' : 'requirement--pending';
            default:
                return 'requirement--pending';
        }
    }
    
    validateField(fieldName) {
        const value = this.state.formData[fieldName];
        const rules = this.validationRules[fieldName];
        
        if (!rules) return true;
        
        for (const rule of rules) {
            const isValid = this.validateRule(value, rule, fieldName);
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
    
    validateRule(value, rule, fieldName) {
        switch (rule.rule) {
            case 'required':
                return value && value.trim().length > 0;
            case 'minLength':
                return value && value.length >= rule.value;
            case 'maxLength':
                return !value || value.length <= rule.value;
            case 'strongPassword':
                return this.isStrongPassword(value);
            case 'matches':
                return value === this.state.formData[rule.field];
            default:
                return true;
        }
    }
    
    isStrongPassword(password) {
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        
        return hasUpper && hasLower && hasNumber && hasSpecial;
    }
    
    isFormValid() {
        return Object.keys(this.state.errors).length === 0 &&
               this.state.formData.password.trim() &&
               this.state.formData.confirmPassword.trim() &&
               this.state.tokenValid === true;
    }
    
    focusFirstInput() {
        if (this.state.tokenValid === true && !this.state.resetComplete) {
            setTimeout(() => {
                const passwordInput = this.container.querySelector('#password');
                if (passwordInput) {
                    passwordInput.focus();
                }
            }, 100);
        }
    }
    
    destroy() {
        super.destroy();
    }
} 