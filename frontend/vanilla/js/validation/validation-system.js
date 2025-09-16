
/**
 * Complete Validation System Entry Point
 * Provides centralized access to all validation components
 */

// Import all validation components
import { 
  ValidationRules, 
  FormValidator, 
  ValidationUtils,
  ValidationError 
} from '../utils/validation.js';

import { 
  FormHandler, 
  setupForm 
} from '../utils/formHandler.js';

import { 
  GlobalErrorHandler, 
  initializeErrorHandler,
  wrapAsync,
  withErrorHandling
} from '../utils/errorHandler.js';

import { ErrorDisplay } from '../components/validation/ErrorDisplay.js';
import { FormField, FormTextarea, FormSelect } from '../components/validation/FormField.js';

// Import schemas
import {
  BoardSchema,
  ItemSchema,
  UserRegistrationSchema,
  UserLoginSchema,
  CommentSchema,
  ProfileSchema,
  WorkspaceSchema,
  SearchSchema,
  FilterSchema,
  SchemaUtils
} from './schemas.js';

// CSS styles for the complete validation system
export const ValidationStyles = `
<style>
/* Global validation styles */
:root {
  --error-color: #d32f2f;
  --success-color: #28a745;
  --warning-color: #ff9800;
  --info-color: #2196f3;
  --border-radius: 4px;
  --transition-speed: 0.3s;
}

/* Form validation states */
.form-field--error input,
.form-field--error textarea,
.form-field--error select {
  border-color: var(--error-color);
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.25);
}

.form-field--success input,
.form-field--success textarea,
.form-field--success select {
  border-color: var(--success-color);
  box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
}

.form-field--warning input,
.form-field--warning textarea,
.form-field--warning select {
  border-color: var(--warning-color);
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.25);
}

/* Focus states */
.form-field:focus-within {
  outline: none;
}

/* Loading states */
.form-submitting {
  position: relative;
  opacity: 0.7;
  pointer-events: none;
}

.form-submitting::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  transform: translate(-50%, -50%);
}

@keyframes spin {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .form-field--error {
    border-width: 2px;
  }
  
  .error-display {
    border: 2px solid var(--error-color);
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .form-field {
    margin-bottom: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .btn {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }
}

/* Error summary styling */
.error-summary {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: var(--border-radius);
  padding: 1rem;
  margin-bottom: 1rem;
}

.error-summary h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: var(--error-color);
}

.error-summary ul {
  margin: 0;
  padding-left: 1.5rem;
}

.error-summary li {
  margin-bottom: 0.25rem;
}

/* Success message styling */
.success-message {
  background: #efe;
  border: 1px solid #cfc;
  border-radius: var(--border-radius);
  padding: 1rem;
  margin-bottom: 1rem;
  color: var(--success-color);
}

/* Warning message styling */
.warning-message {
  background: #fff3e0;
  border: 1px solid #ffcc80;
  border-radius: var(--border-radius);
  padding: 1rem;
  margin-bottom: 1rem;
  color: var(--warning-color);
}
</style>
`;

// System initialization
export class ValidationSystem {
  constructor(options = {}) {
    this.options = {
      autoInit: true,
      includeStyles: true,
      includeA11y: true,
      ...options
    };
    
    this.errorHandler = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    this.errorHandler = initializeErrorHandler();
    
    if (this.options.includeStyles) {
      this.injectStyles();
    }
    
    this.isInitialized = true;
  }

  injectStyles() {
    if (!document.querySelector('#validation-system-styles')) {
      const style = document.createElement('style');
      style.id = 'validation-system-styles';
      style.textContent = ValidationStyles;
      document.head.appendChild(style);
    }
  }

  // Quick setup methods
  createBoardForm(formSelector, submitCallback) {
    return setupForm(formSelector, {
      prepareData: (data) => ({
        ...data,
        color: data.color || '#3b82f6'
      }),
      submitForm: submitCallback,
      onSuccess: (result) => {
        console.log('Board created successfully:', result);
      }
    });
  }

  createItemForm(formSelector, submitCallback) {
    return setupForm(formSelector, {
      submitForm: submitCallback,
      onSuccess: (result) => {
        console.log('Item created successfully:', result);
      }
    });
  }

  createCommentForm(formSelector, submitCallback) {
    return setupForm(formSelector, {
      validateOnChange: true,
      submitForm: submitCallback,
      onSuccess: (result) => {
        console.log('Comment posted successfully:', result);
      }
    });
  }

  createUserForm(formSelector, submitCallback) {
    return setupForm(formSelector, {
      submitForm: submitCallback,
      onSuccess: (result) => {
        console.log('User form submitted successfully:', result);
      }
    });
  }

  // Utility methods
  validateForm(formSelector, schema) {
    const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
    if (!form) return { valid: false, errors: { form: ['Form not found'] } };
    
    const validator = new FormValidator();
    
    Object.keys(schema).forEach(fieldName => {
      validator.addValidator(fieldName, schema[fieldName]);
    });
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    return validator.validate(data);
  }

  addValidator(formSelector, fieldName, validator) {
    const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
    if (!form) return;
    
    let formHandler = form._formHandler;
    if (!formHandler) {
      formHandler = new FormHandler(form);
      form._formHandler = formHandler;
    }
    
    formHandler.addValidator(fieldName, validator);
  }

  showFieldError(formSelector, fieldName, message) {
    const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
    if (!form) return;

    const formHandler = form._formHandler;
    if (formHandler) {
      formHandler.errorDisplay.showFieldError(fieldName, [{ message }]);
    }
  }

  hideFieldError(formSelector, fieldName) {
    const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
    if (!form) return;

    const formHandler = form._formHandler;
    if (formHandler) {
      formHandler.errorDisplay.showFieldError(fieldName, []);
    }
  }

  getErrorHandler() {
    return this.errorHandler;
  }

  isFormValid(formSelector) {
    const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
    if (!form) return false;

    const formHandler = form._formHandler;
    return formHandler ? formHandler.validateForm().valid : false;
  }
}

// Singleton instance
let validationSystemInstance = null;

export function getValidationSystem() {
  if (!validationSystemInstance) {
    validationSystemInstance = new ValidationSystem();
  }
  return validationSystemInstance;
}

// Auto-initialize if configured
if (typeof window !== 'undefined' && window.document) {
  document.addEventListener('DOMContentLoaded', () => {
    const system = getValidationSystem();
    system.init();
  });
}

// Export everything for easy importing
export * from '../utils/validation.js';
export * from '../utils/formHandler.js';
export * from '../utils/errorHandler.js';
export * from '../components/validation/ErrorDisplay.js';
export * from '../components/validation/FormField.js';
export * from './schemas.js';

// Default export
export default getValidationSystem();