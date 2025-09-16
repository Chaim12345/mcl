/**
 * Comprehensive Form Validation System
 * Provides consistent validation across all forms with accessibility support
 */

import { ValidationError } from '../utils/errorHandler.js';

export class FormValidator {
    constructor(options = {}) {
        this.options = {
            liveValidation: true,
            validateOnSubmit: true,
            showInlineErrors: true,
            scrollToFirstError: true,
            ariaLive: 'polite',
            ...options
        };
        
        this.validators = new Map();
        this.errors = new Map();
        this.form = null;
        this.isValidating = false;
    }

    /**
     * Initialize validator for a form
     * @param {HTMLFormElement} form - The form element
     */
    init(form) {
        this.form = form;
        this.setupValidation();
        this.setupAccessibility();
        return this;
    }

    /**
     * Add validation rules for a field
     * @param {string} fieldName - Field name
     * @param {Object|Function} rules - Validation rules or custom validator
     */
    addRule(fieldName, rules) {
        if (typeof rules === 'function') {
            this.validators.set(fieldName, rules);
        } else {
            this.validators.set(fieldName, this.createValidator(rules));
        }
        return this;
    }

    /**
     * Create validator from rules object
     * @param {Object} rules - Validation rules
     * @returns {Function} Validator function
     */
    createValidator(rules) {
        return (value, field, formData) => {
            const errors = [];

            // Required validation
            if (rules.required && (!value || value.trim() === '')) {
                errors.push(rules.requiredMessage || `${field.label || 'This field'} is required`);
            }

            // Email validation
            if (rules.email && value && !this.isValidEmail(value)) {
                errors.push(rules.emailMessage || 'Please enter a valid email address');
            }

            // Min length validation
            if (rules.minLength && value && value.length < rules.minLength) {
                errors.push(rules.minLengthMessage || `Minimum ${rules.minLength} characters required`);
            }

            // Max length validation
            if (rules.maxLength && value && value.length > rules.maxLength) {
                errors.push(rules.maxLengthMessage || `Maximum ${rules.maxLength} characters allowed`);
            }

            // Pattern validation
            if (rules.pattern && value && !rules.pattern.test(value)) {
                errors.push(rules.patternMessage || 'Invalid format');
            }

            // Custom validation
            if (rules.custom && typeof rules.custom === 'function') {
                const customError = rules.custom(value, field, formData);
                if (customError) {
                    errors.push(customError);
                }
            }

            return errors;
        };
    }

    /**
     * Validate a single field
     * @param {HTMLElement} field - Field element
     * @param {*} value - Field value
     * @param {Object} formData - All form data
     * @returns {Array} Array of error messages
     */
    validateField(field, value, formData) {
        const fieldName = field.name || field.id;
        const validator = this.validators.get(fieldName);
        
        if (!validator) {
            return [];
        }

        const errors = validator(value, field, formData);
        this.errors.set(fieldName, errors);
        
        return errors;
    }

    /**
     * Validate entire form
     * @returns {Object} Validation result
     */
    validateForm() {
        if (!this.form) {
            throw new Error('Form not initialized');
        }

        this.isValidating = true;
        this.errors.clear();

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        let isValid = true;

        // Validate all fields
        const fields = this.form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            if (field.name || field.id) {
                const fieldName = field.name || field.id;
                const value = data[fieldName] || field.value;
                const errors = this.validateField(field, value, data);
                
                if (errors.length > 0) {
                    isValid = false;
                }
            }
        });

        this.isValidating = false;
        
        // Show errors
        if (!isValid) {
            this.showErrors();
            if (this.options.scrollToFirstError) {
                this.scrollToFirstError();
            }
        }

        return {
            isValid,
            errors: Object.fromEntries(this.errors),
            hasErrors: !isValid
        };
    }

    /**
     * Show validation errors inline
     */
    showErrors() {
        if (!this.options.showInlineErrors) return;

        // Clear existing errors
        this.clearErrors();

        // Show new errors
        this.errors.forEach((errorMessages, fieldName) => {
            const field = this.form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field && errorMessages.length > 0) {
                this.showFieldError(field, errorMessages[0]);
            }
        });
    }

    /**
     * Show error for a specific field
     * @param {HTMLElement} field - Field element
     * @param {string} message - Error message
     */
    showFieldError(field, message) {
        const fieldContainer = field.closest('.form-field, .form-group, .field-container') || field.parentElement;
        
        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-error';
        errorElement.textContent = message;
        errorElement.setAttribute('role', 'alert');
        errorElement.setAttribute('aria-live', this.options.ariaLive);
        
        // Add ARIA attributes to field
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', `error-${field.name || field.id}`);
        errorElement.id = `error-${field.name || field.id}`;
        
        // Insert error after field
        if (field.type === 'radio' || field.type === 'checkbox') {
            const group = field.closest('.radio-group, .checkbox-group') || fieldContainer;
            group.appendChild(errorElement);
        } else {
            fieldContainer.appendChild(errorElement);
        }
        
        // Add error styling
        field.classList.add('field-error');
    }

    /**
     * Clear all errors
     */
    clearErrors() {
        // Remove error elements
        const existingErrors = this.form.querySelectorAll('.validation-error');
        existingErrors.forEach(error => error.remove());
        
        // Clear ARIA attributes
        const fields = this.form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            field.classList.remove('field-error');
            field.removeAttribute('aria-invalid');
            field.removeAttribute('aria-describedby');
        });
        
        this.errors.clear();
    }

    /**
     * Scroll to first error field
     */
    scrollToFirstError() {
        const firstError = this.form.querySelector('.field-error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        }
    }

    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        if (!this.form) return;

        // Add ARIA attributes
        this.form.setAttribute('novalidate', 'true');
        
        // Add live region for screen readers
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', this.options.ariaLive);
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only form-validation-live-region';
        this.form.appendChild(liveRegion);
        
        this.liveRegion = liveRegion;
    }

    /**
     * Setup validation event listeners
     */
    setupValidation() {
        if (!this.form) return;

        // Submit validation
        if (this.options.validateOnSubmit) {
            this.form.addEventListener('submit', (e) => {
                const result = this.validateForm();
                if (!result.isValid) {
                    e.preventDefault();
                    this.updateLiveRegion('Form validation failed');
                }
            });
        }

        // Live validation
        if (this.options.liveValidation) {
            const fields = this.form.querySelectorAll('input, select, textarea');
            fields.forEach(field => {
                field.addEventListener('blur', () => this.handleFieldBlur(field));
                field.addEventListener('input', () => this.handleFieldInput(field));
            });
        }
    }

    /**
     * Handle field blur event
     * @param {HTMLElement} field - Field element
     */
    handleFieldBlur(field) {
        const fieldName = field.name || field.id;
        const validator = this.validators.get(fieldName);
        
        if (!validator) return;

        const value = field.value;
        const formData = this.getFormData();
        const errors = this.validateField(field, value, formData);

        if (errors.length > 0) {
            this.showFieldError(field, errors[0]);
        } else {
            this.clearFieldError(field);
        }
    }

    /**
     * Handle field input event
     * @param {HTMLElement} field - Field element
     */
    handleFieldInput(field) {
        const fieldName = field.name || field.id;
        
        // Clear errors on input for better UX
        if (this.errors.has(fieldName)) {
            this.clearFieldError(field);
        }
    }

    /**
     * Clear error for specific field
     * @param {HTMLElement} field - Field element
     */
    clearFieldError(field) {
        const fieldContainer = field.closest('.form-field, .form-group, .field-container') || field.parentElement;
        const errorElement = fieldContainer.querySelector('.validation-error');
        
        if (errorElement) {
            errorElement.remove();
        }
        
        field.classList.remove('field-error');
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
        
        const fieldName = field.name || field.id;
        this.errors.delete(fieldName);
    }

    /**
     * Get current form data
     * @returns {Object} Form data object
     */
    getFormData() {
        const formData = new FormData(this.form);
        return Object.fromEntries(formData.entries());
    }

    /**
     * Add common validation rules
     */
    addCommonRules() {
        // Email validation
        this.addRule('email', {
            required: true,
            email: true,
            requiredMessage: 'Email address is required',
            emailMessage: 'Please enter a valid email address'
        });

        // Password validation
        this.addRule('password', {
            required: true,
            minLength: 8,
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            requiredMessage: 'Password is required',
            minLengthMessage: 'Password must be at least 8 characters',
            patternMessage: 'Password must contain uppercase, lowercase, number and special character'
        });

        // Name validation
        this.addRule('name', {
            required: true,
            minLength: 2,
            maxLength: 50,
            requiredMessage: 'Name is required',
            minLengthMessage: 'Name must be at least 2 characters',
            maxLengthMessage: 'Name must not exceed 50 characters'
        });
    }

    /**
     * Update live region for screen readers
     * @param {string} message - Message to announce
     */
    updateLiveRegion(message) {
        if (this.liveRegion) {
            this.liveRegion.textContent = message;
        }
    }

    /**
     * Check if form is valid without showing errors
     * @returns {boolean} True if valid
     */
    isValid() {
        const result = this.validateForm();
        this.clearErrors();
        return result.isValid;
    }

    /**
     * Reset form validation
     */
    reset() {
        this.clearErrors();
        this.errors.clear();
    }
}

// Utility functions
const validators = {
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    url: (value) => {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    phone: (value) => /^[\d\s\-\+\(\)]+$/.test(value),
    numeric: (value) => !isNaN(value) && !isNaN(parseFloat(value)),
    alphanumeric: (value) => /^[a-zA-Z0-9]+$/.test(value)
};

// Export for use
export { FormValidator, validators };