/**
 * Registration Form Component
 */

import { Component } from '../base/Component.js';
import { authService } from '../../services/auth.js';
import { eventBus } from '../../utils/events.js';

export class RegisterForm extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            showPassword: false,
            showConfirmPassword: false,
            verificationSent: false,
            userEmail: '',
            errors: {},
            formData: {
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                confirmPassword: ''
            }
        };
        
        this.validationRules = {
            firstName: [
                { rule: 'required', message: 'First name is required' },
                { rule: 'minLength', value: 2, message: 'First name must be at least 2 characters' },
                { rule: 'maxLength', value: 50, message: 'First name must be less than 50 characters' },
                { rule: 'pattern', value: /^[a-zA-Z\s'-]+$/, message: 'First name can only contain letters, spaces, hyphens, and apostrophes' }
            ],
            lastName: [
                { rule: 'required', message: 'Last name is required' },
                { rule: 'minLength', value: 2, message: 'Last name must be at least 2 characters' },
                { rule: 'maxLength', value: 50, message: 'Last name must be less than 50 characters' },
                { rule: 'pattern', value: /^[a-zA-Z\s'-]+$/, message: 'Last name can only contain letters, spaces, hyphens, and apostrophes' }
            ],
            email: [
                { rule: 'required', message: 'Email is required' },
                { rule: 'email', message: 'Please enter a valid email address' },
                { rule: 'maxLength', value: 255, message: 'Email must be less than 255 characters' }
            ],
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
        this.render();
        this.bindEvents();
        this.focusFirstInput();
    }
    
    render() {
        if (this.state.verificationSent) {
            this.renderVerificationSent();
        } else {
            this.renderRegistrationForm();
        }
    }
    
    renderVerificationSent() {
        this.container.innerHTML = `
            <div class="auth-card">
                <div class="auth-header text-center">
                    <div class="verification-icon">
                        <svg class="icon-large text-success" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                    </div>
                    <h1 class="auth-title">Check your email</h1>
                    <p class="auth-description">
                        We've sent a verification link to 
                        <span class="font-medium">${this.state.userEmail}</span>
                    </p>
                </div>
                
                <div class="verification-content">
                    <div class="alert alert--success">
                        <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        <p>Click the link in your email to verify your account and complete the registration process.</p>
                    </div>
                    
                    <div class="verification-help">
                        <p class="text-muted">Didn't receive the email?</p>
                        <ul class="help-list">
                            <li>Check your spam or junk folder</li>
                            <li>Make sure you entered the correct email address</li>
                            <li>Wait a few minutes for the email to arrive</li>
                        </ul>
                        
                        <button type="button" class="btn btn--outline btn--full-width" data-resend-verification>
                            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            Resend verification email
                        </button>
                    </div>
                </div>
                
                <div class="auth-footer">
                    <button type="button" class="btn btn--primary btn--full-width" data-continue-signin>
                        Continue to Sign In
                    </button>
                    <button type="button" class="btn btn--ghost btn--full-width" data-back-registration>
                        Back to Registration
                    </button>
                </div>
            </div>
        `;
    }
    
    renderRegistrationForm() {
        const { isLoading, showPassword, showConfirmPassword, errors } = this.state;
        const passwordStrength = this.calculatePasswordStrength(this.state.formData.password);
        
        this.container.innerHTML = `
            <div class="auth-card">
                <div class="auth-header">
                    <h1 class="auth-title">Create account</h1>
                    <p class="auth-description">Enter your information to create a new account</p>
                </div>
                
                <form class="auth-form" novalidate>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="firstName" class="form-label">First name</label>
                            <input 
                                type="text" 
                                id="firstName" 
                                name="firstName" 
                                class="form-input ${errors.firstName ? 'form-input--error' : ''}"
                                placeholder="John"
                                autocomplete="given-name"
                                ${isLoading ? 'disabled' : ''}
                                required
                            />
                            ${errors.firstName ? `<span class="form-error">${errors.firstName}</span>` : ''}
                        </div>
                        
                        <div class="form-group">
                            <label for="lastName" class="form-label">Last name</label>
                            <input 
                                type="text" 
                                id="lastName" 
                                name="lastName" 
                                class="form-input ${errors.lastName ? 'form-input--error' : ''}"
                                placeholder="Doe"
                                autocomplete="family-name"
                                ${isLoading ? 'disabled' : ''}
                                required
                            />
                            ${errors.lastName ? `<span class="form-error">${errors.lastName}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="email" class="form-label">Email address</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            class="form-input ${errors.email ? 'form-input--error' : ''}"
                            placeholder="Enter your email"
                            autocomplete="email"
                            ${isLoading ? 'disabled' : ''}
                            required
                        />
                        ${errors.email ? `<span class="form-error">${errors.email}</span>` : ''}
                    </div>
                    
                    <div class="form-group">
                        <label for="password" class="form-label">Password</label>
                        <div class="form-input-wrapper">
                            <input 
                                type="${showPassword ? 'text' : 'password'}" 
                                id="password" 
                                name="password" 
                                class="form-input form-input--with-icon ${errors.password ? 'form-input--error' : ''}"
                                placeholder="Create a password"
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
                                placeholder="Confirm your password"
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
                            Creating account...
                        ` : 'Create account'}
                    </button>
                    
                    <div class="auth-footer">
                        <p class="auth-footer-text">
                            Already have an account? 
                            <a href="/login.html" class="form-link" ${isLoading ? 'tabindex="-1"' : ''}>
                                Sign in
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        `;
    }
    
    bindEvents() {
        if (this.state.verificationSent) {
            this.bindVerificationEvents();
        } else {
            this.bindFormEvents();
        }
    }
    
    bindVerificationEvents() {
        const resendBtn = this.container.querySelector('[data-resend-verification]');
        const continueBtn = this.container.querySelector('[data-continue-signin]');
        const backBtn = this.container.querySelector('[data-back-registration]');
        
        if (resendBtn) {
            resendBtn.addEventListener('click', this.handleResendVerification.bind(this));
        }
        
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                window.location.href = '/login.html';
            });
        }
        
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.setState({ verificationSent: false });
            });
        }
    }
    
    bindFormEvents() {
        const form = this.container.querySelector('.auth-form');
        const inputs = this.container.querySelectorAll('input');
        const togglePasswordBtns = this.container.querySelectorAll('[data-toggle-password]');
        
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
        const { firstName, lastName, email, password } = this.state.formData;
        
        this.setState({ isLoading: true, errors: {} });
        
        try {
            await authService.register({ firstName, lastName, email, password });
            
            this.setState({
                isLoading: false,
                verificationSent: true,
                userEmail: email
            });
        } catch (error) {
            this.setState({ 
                isLoading: false,
                errors: { 
                    submit: error.message || 'Registration failed. Please try again.' 
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
    
    async handleResendVerification() {
        if (this.state.userEmail) {
            try {
                await authService.register({ email: this.state.userEmail });
            } catch (error) {
                // Error already handled by auth service
            }
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
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'minLength':
                return value && value.length >= rule.value;
            case 'maxLength':
                return !value || value.length <= rule.value;
            case 'pattern':
                return !value || rule.value.test(value);
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
        if (!this.state.verificationSent) {
            return Object.keys(this.state.errors).length === 0 &&
                   this.state.formData.firstName.trim() &&
                   this.state.formData.lastName.trim() &&
                   this.state.formData.email.trim() &&
                   this.state.formData.password.trim() &&
                   this.state.formData.confirmPassword.trim();
        }
        return true;
    }
    
    focusFirstInput() {
        if (!this.state.verificationSent) {
            setTimeout(() => {
                const firstNameInput = this.container.querySelector('#firstName');
                if (firstNameInput) {
                    firstNameInput.focus();
                }
            }, 100);
        }
    }
    
    destroy() {
        super.destroy();
    }
} 