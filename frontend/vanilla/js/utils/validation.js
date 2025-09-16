/**
 * Form Validation Utilities
 * Provides comprehensive validation system with accessibility support
 */

export class ValidationError extends Error {
  constructor(message, field = null, code = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

export class ValidationRule {
  constructor(name, validator, message, priority = 1) {
    this.name = name;
    this.validator = validator;
    this.message = message;
    this.priority = priority;
  }

  validate(value, field = null, formData = {}) {
    try {
      const result = this.validator(value, field, formData);
      return result === true ? null : (result || this.message);
    } catch (error) {
      return error.message || this.message;
    }
  }
}

export class ValidationRules {
  static required(message = 'This field is required') {
    return new ValidationRule('required', (value) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }, message);
  }

  static email(message = 'Please enter a valid email address') {
    return new ValidationRule('email', (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    }, message);
  }

  static minLength(min, message = null) {
    const msg = message || `Minimum ${min} characters required`;
    return new ValidationRule('minLength', (value) => {
      if (!value) return true;
      return String(value).length >= min;
    }, msg);
  }

  static maxLength(max, message = null) {
    const msg = message || `Maximum ${max} characters allowed`;
    return new ValidationRule('maxLength', (value) => {
      if (!value) return true;
      return String(value).length <= max;
    }, msg);
  }

  static pattern(regex, message = 'Invalid format') {
    return new ValidationRule('pattern', (value) => {
      if (!value) return true;
      return regex.test(String(value));
    }, message);
  }

  static numeric(message = 'Must be a number') {
    return new ValidationRule('numeric', (value) => {
      if (!value) return true;
      return !isNaN(Number(value)) && isFinite(Number(value));
    }, message);
  }

  static min(min, message = null) {
    const msg = message || `Minimum value is ${min}`;
    return new ValidationRule('min', (value) => {
      if (!value) return true;
      const num = Number(value);
      return !isNaN(num) && num >= min;
    }, msg);
  }

  static max(max, message = null) {
    const msg = message || `Maximum value is ${max}`;
    return new ValidationRule('max', (value) => {
      if (!value) return true;
      const num = Number(value);
      return !isNaN(num) && num <= max;
    }, msg);
  }

  static custom(validator, message = 'Invalid value') {
    return new ValidationRule('custom', validator, message);
  }

  static unique(fieldName, message = 'This value already exists') {
    return new ValidationRule('unique', (value, field, formData) => {
      if (!value) return true;
      // This will be handled by the validator with context
      return true;
    }, message);
  }
}

export class FieldValidator {
  constructor(fieldName, rules = []) {
    this.fieldName = fieldName;
    this.rules = Array.isArray(rules) ? rules : [rules];
    this.asyncRules = [];
  }

  addRule(rule) {
    if (rule.async) {
      this.asyncRules.push(rule);
    } else {
      this.rules.push(rule);
    }
    return this;
  }

  async validate(value, formData = {}) {
    const errors = [];
    
    // Validate sync rules
    for (const rule of this.rules) {
      const error = rule.validate(value, this.fieldName, formData);
      if (error) {
        errors.push({
          rule: rule.name,
          message: error,
          field: this.fieldName
        });
        if (rule.stopOnError) break;
      }
    }

    // Validate async rules
    for (const rule of this.asyncRules) {
      try {
        const error = await rule.validate(value, this.fieldName, formData);
        if (error) {
          errors.push({
            rule: rule.name,
            message: error,
            field: this.fieldName
          });
        }
      } catch (error) {
        errors.push({
          rule: rule.name,
          message: error.message || 'Validation failed',
          field: this.fieldName
        });
      }
    }

    return errors;
  }
}

export class FormValidator {
  constructor(validators = {}) {
    this.validators = validators;
    this.customValidators = [];
    this.context = {};
  }

  addValidator(fieldName, validator) {
    if (validator instanceof FieldValidator) {
      this.validators[fieldName] = validator;
    } else {
      this.validators[fieldName] = new FieldValidator(fieldName, validator);
    }
    return this;
  }

  addCustomValidator(validator) {
    this.customValidators.push(validator);
    return this;
  }

  async validate(formData, options = {}) {
    const { partial = false, validateEmpty = true } = options;
    const errors = {};
    let hasErrors = false;

    // Validate individual fields
    const fieldPromises = Object.keys(this.validators).map(async (fieldName) => {
      const value = formData[fieldName];
      
      if (!validateEmpty && (value === null || value === undefined || value === '')) {
        return;
      }

      const validator = this.validators[fieldName];
      const fieldErrors = await validator.validate(value, formData);
      
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
        hasErrors = true;
      }
    });

    await Promise.all(fieldPromises);

    // Run custom validators
    for (const validator of this.customValidators) {
      try {
        const customErrors = await validator(formData, this.context);
        if (customErrors && customErrors.length > 0) {
          customErrors.forEach(error => {
            if (!errors[error.field]) errors[error.field] = [];
            errors[error.field].push(error);
            hasErrors = true;
          });
        }
      } catch (error) {
        console.error('Custom validator error:', error);
      }
    }

    return {
      valid: !hasErrors,
      errors,
      hasErrors
    };
  }

  setContext(context) {
    this.context = { ...this.context, ...context };
    return this;
  }

  validateField(fieldName, value, formData = {}) {
    const validator = this.validators[fieldName];
    if (!validator) return { valid: true, errors: [] };

    return validator.validate(value, formData);
  }
}

// Utility functions
export const ValidationUtils = {
  sanitizeInput(value, type = 'text') {
    if (!value) return value;
    
    switch (type) {
      case 'email':
        return String(value).trim().toLowerCase();
      case 'text':
        return String(value).trim();
      case 'number':
        return isNaN(Number(value)) ? null : Number(value);
      default:
        return String(value).trim();
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatErrorMessage(error, fieldLabel = null) {
    const label = fieldLabel || error.field;
    return error.message.replace('{field}', label || 'Field');
  },

  createValidator(schema) {
    const validator = new FormValidator();
    
    Object.keys(schema).forEach(fieldName => {
      const rules = schema[fieldName];
      const fieldValidator = new FieldValidator(fieldName, rules);
      validator.addValidator(fieldName, fieldValidator);
    });

    return validator;
  }
};