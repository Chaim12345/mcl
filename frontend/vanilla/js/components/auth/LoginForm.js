/**
 * Login Form Component
 */

import { Component } from '../base/Component.js';
import { authService } from '../../services/auth.js';
import { eventBus } from '../../utils/events.js';

export class LoginForm extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isLoading: false,
            showPassword: false,
            rememberMe: false,
            errors: {},
            formData: {
                email: '',
                password: ''
            }
        };
        
        this.validationRules = {
            email: [
                { rule: 'required', message: 'Email is required' },
                { rule: 'email', message: 'Please enter a valid email address' },
                { rule: 'maxLength', value: 255, message: 'Email must be less than 255 characters' }
            ],
            password: [
                { rule: 'required', message: 'Password is required' },
                { rule: 'minLength', value: 6, message: 'Password must be at least 6 characters' }
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
        const { isLoading, showPassword, rememberMe, errors } = this.state;
        
        this.container.innerHTML = `
            <div class="auth-card">
                <div class="auth-header">
                    <h1 class="auth-title">Welcome back</h1>
                    <p class="auth-description">Enter your credentials to access your account</p>
                </div>
                
                <form class="auth-form" novalidate>
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
                        ${errors.email ? `<span class="form-error" id="email-error">${errors.email}</span>` : ''}
                    </div>
                    
                    <div class="form-group">
                        <label for="password" class="form-label">Password</label>
                        <div class="form-input-wrapper">
                            <input 
                                type="${showPassword ? 'text' : 'password'}" 
                                id="password" 
                                name="password" 
                                class="form-input form-input--with-icon ${errors.password ? 'form-input--error' : ''}"
                                placeholder="Enter your password"
                                autocomplete="current-password"
                                ${isLoading ? 'disabled' : ''}
                                required
                            />
                            <button 
                                type="button" 
                                class="form-input-icon" 
                                data-toggle-password
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
                        ${errors.password ? `<span class="form-error" id="password-error">${errors.password}</span>` : ''}
                    </div>
                    
                    <div class="form-options">
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                name="rememberMe" 
                                ${rememberMe ? 'checked' : ''}
                                ${isLoading ? 'disabled' : ''}
                            />
                            <span class="checkbox-checkmark"></span>
                            <span class="checkbox-text">Remember me</span>
                        </label>
                        
                        <a href="/forgot-password.html" class="form-link" ${isLoading ? 'tabindex="-1"' : ''}>
                            Forgot password?
                        </a>
                    </div>
                    
                    <button 
                        type="submit" 
                        class="btn btn--primary btn--full-width"
                        ${isLoading || !this.isFormValid() ? 'disabled' : ''}
                    >
                        ${isLoading ? `
                            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
                                <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Signing in...
                        ` : 'Sign in'}
                    </button>
                    
                    <div class="auth-footer">
                        <p class="auth-footer-text">
                            Don't have an account? 
                            <a href="/register.html" class="form-link" ${isLoading ? 'tabindex="-1"' : ''}>
                                Sign up
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        `;
    }
    
    bindEvents() {
        const form = this.container.querySelector('.auth-form');
        const emailInput = this.container.querySelector('#email');
        const passwordInput = this.container.querySelector('#password');
        const rememberMeInput = this.container.querySelector('input[name="rememberMe"]');
        const togglePasswordBtn = this.container.querySelector('[data-toggle-password]');
        
        // Form submission
        form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Input changes
        emailInput.addEventListener('input', this.handleInputChange.bind(this));
        emailInput.addEventListener('blur', this.handleInputBlur.bind(this));
        passwordInput.addEventListener('input', this.handleInputChange.bind(this));
        passwordInput.addEventListener('blur', this.handleInputBlur.bind(this));
        
        // Remember me checkbox
        rememberMeInput.addEventListener('change', this.handleRememberMeChange.bind(this));
        
        // Password visibility toggle
        togglePasswordBtn.addEventListener('click', this.togglePasswordVisibility.bind(this));
        
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
        const { email, password } = this.state.formData;
        
        this.setState({ isLoading: true, errors: {} });
        
        try {
            await authService.login({ email, password });
            
            // Redirect will be handled by the auth service
            // or we can handle it here based on options
            if (this.options.onSuccess) {
                this.options.onSuccess();
            } else {
                window.location.href = this.options.redirectTo || '/dashboard.html';
            }
        } catch (error) {
            this.setState({ 
                isLoading: false,
                errors: { 
                    submit: error.message || 'Login failed. Please try again.' 
                }
            });
            
            // Reset password field on error
            this.state.formData.password = '';
            const passwordInput = this.container.querySelector('#password');
            passwordInput.value = '';
            passwordInput.focus();
            
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
    }
    
    handleRememberMeChange(event) {
        this.setState({ rememberMe: event.target.checked });
    }
    
    togglePasswordVisibility() {
        this.setState({ showPassword: !this.state.showPassword });
    }
    
    handleKeyDown(event) {
        // Submit on Ctrl+Enter
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            this.handleSubmit(event);
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
    
    validateForm() {
        const errors = {};
        
        for (const fieldName in this.validationRules) {
            if (!this.validateField(fieldName)) {
                // Error already set in validateField
            }
        }
        
        return Object.keys(this.state.errors).length === 0;
    }
    
    validateRule(value, rule) {
        switch (rule.rule) {
            case 'required':
                return value && value.trim().length > 0;
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'minLength':
                return value && value.length >= rule.value;
            case 'maxLength':
                return !value || value.length <= rule.value;
            default:
                return true;
        }
    }
    
    isFormValid() {
        return Object.keys(this.state.errors).length === 0 &&
               this.state.formData.email.trim() &&
               this.state.formData.password.trim();
    }
    
    focusFirstInput() {
        setTimeout(() => {
            const emailInput = this.container.querySelector('#email');
            if (emailInput) {
                emailInput.focus();
            }
        }, 100);
    }
    
    // Update form data from external source (e.g., URL params)
    setFormData(data) {
        this.state.formData = { ...this.state.formData, ...data };
        
        // Update input values
        Object.keys(data).forEach(key => {
            const input = this.container.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = data[key];
            }
        });
    }
    
    // Clear form
    clearForm() {
        this.state.formData = { email: '', password: '' };
        this.state.errors = {};
        this.setState({ isLoading: false });
        
        const form = this.container.querySelector('.auth-form');
        if (form) {
            form.reset();
        }
    }
    
    destroy() {
        super.destroy();
    }
} 