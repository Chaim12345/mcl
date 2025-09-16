/**
 * Comprehensive Validation System with Real-time Feedback
 */

export class ValidationSystem {
    constructor() {
        this.validators = new Map();
        this.errorMessages = new Map();
        this.validationRules = {
            required: (value) => value !== null && value !== undefined && value.toString().trim() !== '',
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            minLength: (value, min) => value.toString().length >= min,
            maxLength: (value, max) => value.toString().length <= max,
            pattern: (value, regex) => regex.test(value),
            number: (value) => !isNaN(value) && isFinite(value),
            positiveNumber: (value) => !isNaN(value) && parseFloat(value) > 0,
            date: (value) => !isNaN(Date.parse(value)),
            futureDate: (value) => new Date(value) > new Date(),
            pastDate: (value) => new Date(value) < new Date(),
            url: (value) => {
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            }
        };
        
        this.defaultMessages = {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            minLength: 'Must be at least {min} characters long',
            maxLength: 'Must be no more than {max} characters long',
            pattern: 'Invalid format',
            number: 'Must be a valid number',
            positiveNumber: 'Must be a positive number',
            date: 'Must be a valid date',
            futureDate: 'Date must be in the future',
            pastDate: 'Date must be in the past',
            url: 'Must be a valid URL'
        };
    }

    // Register a field for validation
    registerField(fieldId, rules, customMessages = {}) {
        const field = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
        if (!field) {
            console.warn(`Field ${fieldId} not found`);
            return;
        }

        this.validators.set(fieldId, { rules, field });
        this.errorMessages.set(fieldId, { ...this.defaultMessages, ...customMessages });
        
        this.setupFieldValidation(field, fieldId);
    }

    setupFieldValidation(field, fieldId) {
        // Create error display element
        const errorElement = this.createErrorElement(fieldId);
        
        // Add validation on blur and input
        field.addEventListener('blur', () => this.validateField(fieldId));
        field.addEventListener('input', () => this.validateFieldRealtime(fieldId));
        
        // Add visual feedback
        field.addEventListener('focus', () => this.clearFieldError(fieldId));
    }

    createErrorElement(fieldId) {
        const existingError = document.getElementById(`${fieldId}-error`);
        if (existingError) return existingError;
        
        const errorElement = document.createElement('div');
        errorElement.id = `${fieldId}-error`;
        errorElement.className = 'validation-error';
        errorElement.style.cssText = `
            color: #e2445c;
            font-size: 12px;
            margin-top: 4px;
            display: none;
            animation: fadeIn 0.3s ease;
        `;
        
        const field = this.validators.get(fieldId)?.field;
        if (field && field.parentNode) {
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
        
        return errorElement;
    }

    validateField(fieldId, showErrors = true) {
        const validator = this.validators.get(fieldId);
        if (!validator) return true;
        
        const { field, rules } = validator;
        const value = this.getFieldValue(field);
        const errors = [];
        
        for (const rule of rules) {
            const result = this.applyRule(value, rule);
            if (!result.valid) {
                errors.push(result.message);
            }
        }
        
        if (showErrors) {
            this.displayFieldErrors(fieldId, errors);
        }
        
        return errors.length === 0;
    }

    validateFieldRealtime(fieldId) {
        // Only show errors after user has started typing and left the field
        const field = this.validators.get(fieldId)?.field;
        if (field && field.dataset.touched === 'true') {
            this.validateField(fieldId);
        }
    }

    applyRule(value, rule) {
        const messages = this.errorMessages.get(rule.field) || this.defaultMessages;
        
        switch (rule.type) {
            case 'required':
                return {
                    valid: this.validationRules.required(value),
                    message: messages.required
                };
                
            case 'email':
                return {
                    valid: !value || this.validationRules.email(value),
                    message: messages.email
                };
                
            case 'minLength':
                return {
                    valid: !value || this.validationRules.minLength(value, rule.value),
                    message: messages.minLength.replace('{min}', rule.value)
                };
                
            case 'maxLength':
                return {
                    valid: !value || this.validationRules.maxLength(value, rule.value),
                    message: messages.maxLength.replace('{max}', rule.value)
                };
                
            case 'pattern':
                return {
                    valid: !value || this.validationRules.pattern(value, rule.value),
                    message: rule.message || messages.pattern
                };
                
            case 'number':
                return {
                    valid: !value || this.validationRules.number(value),
                    message: messages.number
                };
                
            case 'positiveNumber':
                return {
                    valid: !value || this.validationRules.positiveNumber(value),
                    message: messages.positiveNumber
                };
                
            case 'date':
                return {
                    valid: !value || this.validationRules.date(value),
                    message: messages.date
                };
                
            case 'futureDate':
                return {
                    valid: !value || this.validationRules.futureDate(value),
                    message: messages.futureDate
                };
                
            case 'pastDate':
                return {
                    valid: !value || this.validationRules.pastDate(value),
                    message: messages.pastDate
                };
                
            case 'url':
                return {
                    valid: !value || this.validationRules.url(value),
                    message: messages.url
                };
                
            case 'custom':
                return {
                    valid: rule.validator(value),
                    message: rule.message || 'Invalid value'
                };
                
            default:
                return { valid: true, message: '' };
        }
    }

    getFieldValue(field) {
        switch (field.type) {
            case 'checkbox':
                return field.checked;
            case 'radio':
                const radioGroup = document.querySelectorAll(`input[name="${field.name}"]`);
                for (const radio of radioGroup) {
                    if (radio.checked) return radio.value;
                }
                return null;
            case 'select-multiple':
                return Array.from(field.selectedOptions).map(opt => opt.value);
            default:
                return field.value;
        }
    }

    displayFieldErrors(fieldId, errors) {
        const field = this.validators.get(fieldId)?.field;
        const errorElement = document.getElementById(`${fieldId}-error`);
        
        if (!field || !errorElement) return;
        
        if (errors.length > 0) {
            field.classList.add('validation-error-field');
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', `${fieldId}-error`);
            
            errorElement.textContent = errors[0]; // Show first error
            errorElement.style.display = 'block';
            
            // Mark field as touched
            field.dataset.touched = 'true';
        } else {
            this.clearFieldError(fieldId);
        }
    }

    clearFieldError(fieldId) {
        const field = this.validators.get(fieldId)?.field;
        const errorElement = document.getElementById(`${fieldId}-error`);
        
        if (field) {
            field.classList.remove('validation-error-field');
            field.removeAttribute('aria-invalid');
            field.removeAttribute('aria-describedby');
        }
        
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
    }

    validateForm(formId) {
        let isValid = true;
        const errors = {};
        
        for (const [fieldId, validator] of this.validators) {
            const fieldValid = this.validateField(fieldId);
            if (!fieldValid) {
                isValid = false;
                const errorElement = document.getElementById(`${fieldId}-error`);
                if (errorElement) {
                    errors[fieldId] = errorElement.textContent;
                }
            }
        }
        
        return { isValid, errors };
    }

    // Utility methods for common validation scenarios
    validateEmail(fieldId, required = false) {
        const rules = [];
        if (required) rules.push({ type: 'required' });
        rules.push({ type: 'email' });
        
        this.registerField(fieldId, rules);
    }

    validateRequired(fieldId, customMessage) {
        this.registerField(fieldId, [{ type: 'required' }], 
            customMessage ? { required: customMessage } : {});
    }

    validateText(fieldId, options = {}) {
        const rules = [];
        if (options.required) rules.push({ type: 'required' });
        if (options.minLength) rules.push({ type: 'minLength', value: options.minLength });
        if (options.maxLength) rules.push({ type: 'maxLength', value: options.maxLength });
        if (options.pattern) rules.push({ type: 'pattern', value: options.pattern });
        
        this.registerField(fieldId, rules, options.messages || {});
    }

    validateNumber(fieldId, options = {}) {
        const rules = [];
        if (options.required) rules.push({ type: 'required' });
        rules.push({ type: 'number' });
        if (options.positive) rules.push({ type: 'positiveNumber' });
        
        this.registerField(fieldId, rules, options.messages || {});
    }

    validateDate(fieldId, options = {}) {
        const rules = [];
        if (options.required) rules.push({ type: 'required' });
        rules.push({ type: 'date' });
        if (options.future) rules.push({ type: 'futureDate' });
        if (options.past) rules.push({ type: 'pastDate' });
        
        this.registerField(fieldId, rules, options.messages || {});
    }

    // Custom validation
    addCustomValidator(name, validator, message) {
        this.validationRules[name] = validator;
        this.defaultMessages[name] = message;
    }

    // Reset validation for a field
    resetField(fieldId) {
        this.clearFieldError(fieldId);
        const field = this.validators.get(fieldId)?.field;
        if (field) {
            field.dataset.touched = 'false';
        }
    }

    // Reset entire form
    resetForm() {
        for (const fieldId of this.validators.keys()) {
            this.resetField(fieldId);
        }
    }
}

// Enhanced Error Display Component
export class ErrorDisplay {
    constructor(container) {
        this.container = container;
        this.errors = [];
    }

    showError(message, type = 'error', duration = 5000) {
        const errorEl = document.createElement('div');
        errorEl.className = `error-notification error-${type}`;
        errorEl.innerHTML = `
            <div class="error-content">
                <span class="error-icon">${this.getIcon(type)}</span>
                <span class="error-message">${message}</span>
                <button class="error-close" aria-label="Close">&times;</button>
            </div>
        `;
        
        errorEl.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            position: relative;
            overflow: hidden;
        `;
        
        // Add progress bar for auto-dismiss
        if (duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'error-progress';
            progressBar.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: rgba(255,255,255,0.3);
                width: 100%;
                transform-origin: left;
                animation: progressBar ${duration}ms linear;
            `;
            errorEl.appendChild(progressBar);
        }
        
        // Close button handler
        errorEl.querySelector('.error-close').addEventListener('click', () => {
            this.removeError(errorEl);
        });
        
        this.container.appendChild(errorEl);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => this.removeError(errorEl), duration);
        }
        
        return errorEl;
    }

    removeError(errorEl) {
        if (errorEl && errorEl.parentNode) {
            errorEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (errorEl.parentNode) {
                    errorEl.parentNode.removeChild(errorEl);
                }
            }, 300);
        }
    }

    getIcon(type) {
        const icons = {
            error: '⚠️',
            warning: '⚡',
            success: '✅',
            info: 'ℹ️'
        };
        return icons[type] || icons.error;
    }

    getBackgroundColor(type) {
        const colors = {
            error: '#e2445c',
            warning: '#fdab3d',
            success: '#00c875',
            info: '#0073ea'
        };
        return colors[type] || colors.error;
    }

    clearAll() {
        const errors = this.container.querySelectorAll('.error-notification');
        errors.forEach(error => this.removeError(error));
    }
}

// Add global validation styles
const validationStyles = document.createElement('style');
validationStyles.textContent = `
    .validation-error-field {
        border-color: #e2445c !important;
        box-shadow: 0 0 0 2px rgba(226, 68, 92, 0.2) !important;
    }
    
    .validation-error {
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); }
        to { transform: translateX(100%); }
    }
    
    @keyframes progressBar {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
    }
    
    .error-content {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
    }
    
    .error-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
        opacity: 0.8;
    }
    
    .error-close:hover {
        opacity: 1;
    }
`;
document.head.appendChild(validationStyles);
