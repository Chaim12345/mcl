/**
 * FormField Component
 * Enhanced form field with built-in validation and accessibility
 */
import { ErrorDisplay } from './ErrorDisplay.js';
import { ValidationUtils } from '../../utils/validation.js';

export class FormField {
  constructor(name, type = 'text', options = {}) {
    this.name = name;
    this.type = type;
    this.options = {
      label: null,
      placeholder: null,
      required: false,
      disabled: false,
      readonly: false,
      autocomplete: null,
      ariaLabel: null,
      description: null,
      ...options
    };
    
    this.element = null;
    this.labelElement = null;
    this.inputElement = null;
    this.errorDisplay = null;
    this.validators = [];
    this.isValid = true;
    this.touched = false;
    this.value = null;
  }

  create() {
    this.createContainer();
    this.createLabel();
    this.createInput();
    this.createDescription();
    this.createErrorDisplay();
    this.setupEventListeners();
    
    return this.element;
  }

  createContainer() {
    this.element = document.createElement('div');
    this.element.className = 'form-field';
    this.element.setAttribute('data-field', this.name);
  }

  createLabel() {
    if (this.options.label) {
      this.labelElement = document.createElement('label');
      this.labelElement.className = 'form-field__label';
      this.labelElement.textContent = this.options.label;
      this.labelElement.setAttribute('for', this.getInputId());
      
      if (this.options.required) {
        const required = document.createElement('span');
        required.className = 'form-field__required';
        required.textContent = ' *';
        required.setAttribute('aria-label', 'required');
        this.labelElement.appendChild(required);
      }
      
      this.element.appendChild(this.labelElement);
    }
  }

  createInput() {
    this.inputElement = document.createElement('input');
    this.inputElement.className = 'form-field__input';
    this.inputElement.type = this.type;
    this.inputElement.name = this.name;
    this.inputElement.id = this.getInputId();
    
    if (this.options.placeholder) {
      this.inputElement.placeholder = this.options.placeholder;
    }
    
    if (this.options.disabled) {
      this.inputElement.disabled = true;
    }
    
    if (this.options.readonly) {
      this.inputElement.readOnly = true;
    }
    
    if (this.options.autocomplete) {
      this.inputElement.autocomplete = this.options.autocomplete;
    }
    
    if (this.options.ariaLabel) {
      this.inputElement.setAttribute('aria-label', this.options.ariaLabel);
    } else if (this.options.label) {
      this.inputElement.setAttribute('aria-labelledby', this.getLabelId());
    }
    
    if (this.options.required) {
      this.inputElement.required = true;
    }
    
    this.element.appendChild(this.inputElement);
  }

  createDescription() {
    if (this.options.description) {
      const description = document.createElement('div');
      description.className = 'form-field__description';
      description.textContent = this.options.description;
      description.id = this.getDescriptionId();
      description.setAttribute('aria-live', 'polite');
      
      this.inputElement.setAttribute('aria-describedby', this.getDescriptionId());
      this.element.appendChild(description);
    }
  }

  createErrorDisplay() {
    this.errorDisplay = new ErrorDisplay(this.element, {
      showIcon: false,
      autoClear: false
    });
  }

  setupEventListeners() {
    this.inputElement.addEventListener('input', (e) => {
      this.value = e.target.value;
      if (this.touched) {
        this.validate();
      }
    });

    this.inputElement.addEventListener('blur', () => {
      this.touched = true;
      this.validate();
    });

    this.inputElement.addEventListener('focus', () => {
      this.inputElement.classList.add('form-field__input--focused');
    });

    this.inputElement.addEventListener('keydown', (e) => {
      // Clear errors on Escape
      if (e.key === 'Escape') {
        this.clearErrors();
      }
    });
  }

  addValidator(validator) {
    this.validators.push(validator);
    return this;
  }

  async validate() {
    const errors = [];
    
    for (const validator of this.validators) {
      const result = await validator(this.value, this.name);
      if (result && result.length > 0) {
        errors.push(...result);
      }
    }

    this.setValidationState(errors.length === 0, errors);
    return errors;
  }

  setValidationState(isValid, errors = []) {
    this.isValid = isValid;
    
    if (isValid) {
      this.inputElement.classList.remove('form-field__input--error');
      this.inputElement.classList.add('form-field__input--valid');
      this.inputElement.setAttribute('aria-invalid', 'false');
      this.errorDisplay.showFieldError(this.name, []);
    } else {
      this.inputElement.classList.remove('form-field__input--valid');
      this.inputElement.classList.add('form-field__input--error');
      this.inputElement.setAttribute('aria-invalid', 'true');
      this.errorDisplay.showFieldError(this.name, errors);
    }
  }

  clearErrors() {
    this.setValidationState(true, []);
    this.touched = false;
  }

  setValue(value) {
    this.value = value;
    this.inputElement.value = value || '';
    
    if (this.touched) {
      this.validate();
    }
  }

  getValue() {
    return this.inputElement.value;
  }

  focus() {
    this.inputElement.focus();
  }

  disable() {
    this.inputElement.disabled = true;
  }

  enable() {
    this.inputElement.disabled = false;
  }

  getInputId() {
    return `form-field-${this.name}`;
  }

  getLabelId() {
    return `form-field-label-${this.name}`;
  }

  getDescriptionId() {
    return `form-field-description-${this.name}`;
  }

  destroy() {
    if (this.errorDisplay) {
      this.errorDisplay.destroy();
    }
    
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// Extended form field types
export class FormTextarea extends FormField {
  constructor(name, options = {}) {
    super(name, 'textarea', options);
  }

  createInput() {
    this.inputElement = document.createElement('textarea');
    this.inputElement.className = 'form-field__textarea';
    this.inputElement.name = this.name;
    this.inputElement.id = this.getInputId();
    
    if (this.options.placeholder) {
      this.inputElement.placeholder = this.options.placeholder;
    }
    
    if (this.options.disabled) {
      this.inputElement.disabled = true;
    }
    
    if (this.options.readonly) {
      this.inputElement.readOnly = true;
    }
    
    if (this.options.ariaLabel) {
      this.inputElement.setAttribute('aria-label', this.options.ariaLabel);
    } else if (this.options.label) {
      this.inputElement.setAttribute('aria-labelledby', this.getLabelId());
    }
    
    if (this.options.required) {
      this.inputElement.required = true;
    }
    
    if (this.options.rows) {
      this.inputElement.rows = this.options.rows;
    }
    
    if (this.options.cols) {
      this.inputElement.cols = this.options.cols;
    }
    
    this.element.appendChild(this.inputElement);
  }
}

export class FormSelect extends FormField {
  constructor(name, options = {}) {
    super(name, 'select', options);
    this.options = {
      ...this.options,
      options: [],
      multiple: false,
      ...options
    };
  }

  createInput() {
    this.inputElement = document.createElement('select');
    this.inputElement.className = 'form-field__select';
    this.inputElement.name = this.name;
    this.inputElement.id = this.getInputId();
    
    if (this.options.disabled) {
      this.inputElement.disabled = true;
    }
    
    if (this.options.multiple) {
      this.inputElement.multiple = true;
    }
    
    if (this.options.ariaLabel) {
      this.inputElement.setAttribute('aria-label', this.options.ariaLabel);
    } else if (this.options.label) {
      this.inputElement.setAttribute('aria-labelledby', this.getLabelId());
    }
    
    if (this.options.required) {
      this.inputElement.required = true;
    }
    
    this.populateOptions();
    this.element.appendChild(this.inputElement);
  }

  populateOptions() {
    if (this.options.placeholder) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = this.options.placeholder;
      placeholder.disabled = true;
      placeholder.selected = true;
      this.inputElement.appendChild(placeholder);
    }

    this.options.options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.disabled) option.disabled = true;
      if (opt.selected) option.selected = true;
      this.inputElement.appendChild(option);
    });
  }

  setOptions(options) {
    this.options.options = options;
    this.inputElement.innerHTML = '';
    this.populateOptions();
  }
}

// CSS styles for form fields
export const FormFieldStyles = `
<style>
.form-field {
  margin-bottom: 16px;
}

.form-field__label {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
  color: #333;
}

.form-field__required {
  color: #d32f2f;
}

.form-field__input,
.form-field__textarea,
.form-field__select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-field__textarea {
  min-height: 100px;
  resize: vertical;
}

.form-field__input:focus,
.form-field__textarea:focus,
.form-field__select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-field__input--error,
.form-field__textarea--error,
.form-field__select--error {
  border-color: #d32f2f;
}

.form-field__input--error:focus,
.form-field__textarea--error:focus,
.form-field__select--error:focus {
  border-color: #d32f2f;
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.25);
}

.form-field__input--valid,
.form-field__textarea--valid,
.form-field__select--valid {
  border-color: #28a745;
}

.form-field__description {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .form-field {
    margin-bottom: 12px;
  }
  
  .form-field__input,
  .form-field__textarea,
  .form-field__select {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
</style>
`;