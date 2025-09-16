/**
 * Validation System Tests
 * Comprehensive testing for the new validation system
 */

import { FormValidator, validators } from '../../js/validation/formValidator.js';

describe('FormValidator', () => {
    let form;
    let validator;

    beforeEach(() => {
        // Create test form
        document.body.innerHTML = `
            <form id="test-form" novalidate>
                <div class="form-field">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-field">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <div class="form-field">
                    <label for="name">Name</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <button type="submit">Submit</button>
            </form>
        `;
        
        form = document.getElementById('test-form');
        validator = new FormValidator();
        validator.init(form);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        test('should initialize with form', () => {
            expect(validator.form).toBe(form);
        });

        test('should add novalidate attribute', () => {
            expect(form.hasAttribute('novalidate')).toBe(true);
        });

        test('should create live region', () => {
            const liveRegion = form.querySelector('.form-validation-live-region');
            expect(liveRegion).toBeTruthy();
            expect(liveRegion.getAttribute('aria-live')).toBe('polite');
        });
    });

    describe('Validation Rules', () => {
        test('should add validation rules', () => {
            const rule = { required: true };
            validator.addRule('email', rule);
            expect(validator.validators.has('email')).toBe(true);
        });

        test('should validate required fields', () => {
            validator.addRule('email', { required: true });
            const errors = validator.validateField(
                form.querySelector('#email'), 
                '', 
                {}
            );
            expect(errors).toContain('Email is required');
        });

        test('should validate email format', () => {
            validator.addRule('email', { 
                required: true, 
                email: true,
                emailMessage: 'Please enter a valid email address'
            });
            
            const errors = validator.validateField(
                form.querySelector('#email'), 
                'invalid-email', 
                {}
            );
            expect(errors).toContain('Please enter a valid email address');
        });

        test('should validate min length', () => {
            validator.addRule('password', { 
                minLength: 8,
                minLengthMessage: 'Password must be at least 8 characters'
            });
            
            const errors = validator.validateField(
                form.querySelector('#password'), 
                'short', 
                {}
            );
            expect(errors).toContain('Password must be at least 8 characters');
        });

        test('should validate max length', () => {
            validator.addRule('name', { 
                maxLength: 50,
                maxLengthMessage: 'Name must not exceed 50 characters'
            });
            
            const errors = validator.validateField(
                form.querySelector('#name'), 
                'a'.repeat(51), 
                {}
            );
            expect(errors).toContain('Name must not exceed 50 characters');
        });
    });

    describe('Form Validation', () => {
        test('should validate entire form', () => {
            validator.addRule('email', { required: true });
            validator.addRule('password', { required: true });
            
            const result = validator.validateForm();
            expect(result.isValid).toBe(false);
            expect(result.hasErrors).toBe(true);
            expect(result.errors.email).toBeDefined();
        });

        test('should return valid for complete form', () => {
            validator.addRule('email', { required: true, email: true });
            validator.addRule('password', { required: true, minLength: 8 });
            
            // Fill form with valid data
            form.querySelector('#email').value = 'test@example.com';
            form.querySelector('#password').value = 'password123';
            
            const result = validator.validateForm();
            expect(result.isValid).toBe(true);
            expect(result.hasErrors).toBe(false);
        });
    });

    describe('Error Display', () => {
        test('should show field error', () => {
            const field = form.querySelector('#email');
            validator.showFieldError(field, 'This field is required');
            
            const errorElement = form.querySelector('.validation-error');
            expect(errorElement).toBeTruthy();
            expect(errorElement.textContent).toBe('This field is required');
            expect(errorElement.getAttribute('role')).toBe('alert');
        });

        test('should clear errors', () => {
            const field = form.querySelector('#email');
            validator.showFieldError(field, 'This field is required');
            
            validator.clearErrors();
            
            const errorElement = form.querySelector('.validation-error');
            expect(errorElement).toBeFalsy();
            expect(field.hasAttribute('aria-invalid')).toBe(false);
        });

        test('should clear specific field error', () => {
            const field = form.querySelector('#email');
            validator.showFieldError(field, 'This field is required');
            
            validator.clearFieldError(field);
            
            const errorElement = field.parentElement.querySelector('.validation-error');
            expect(errorElement).toBeFalsy();
            expect(field.hasAttribute('aria-invalid')).toBe(false);
        });
    });

    describe('Accessibility', () => {
        test('should add ARIA attributes to error fields', () => {
            const field = form.querySelector('#email');
            validator.showFieldError(field, 'This field is required');
            
            expect(field.getAttribute('aria-invalid')).toBe('true');
            expect(field.getAttribute('aria-describedby')).toBe('error-email');
        });

        test('should remove ARIA attributes when clearing', () => {
            const field = form.querySelector('#email');
            validator.showFieldError(field, 'This field is required');
            validator.clearFieldError(field);
            
            expect(field.hasAttribute('aria-invalid')).toBe(false);
            expect(field.hasAttribute('aria-describedby')).toBe(false);
        });
    });

    describe('Utility Functions', () => {
        test('should validate email format', () => {
            expect(validators.email('test@example.com')).toBe(true);
            expect(validators.email('invalid-email')).toBe(false);
            expect(validators.email('')).toBe(false);
        });

        test('should validate URL format', () => {
            expect(validators.url('https://example.com')).toBe(true);
            expect(validators.url('invalid-url')).toBe(false);
            expect(validators.url('')).toBe(false);
        });

        test('should validate phone format', () => {
            expect(validators.phone('123-456-7890')).toBe(true);
            expect(validators.phone('(123) 456-7890')).toBe(true);
            expect(validators.phone('1234567890')).toBe(true);
            expect(validators.phone('invalid-phone')).toBe(false);
        });
    });

    describe('Form Events', () => {
        test('should prevent form submission on validation error', () => {
            validator.addRule('email', { required: true });
            
            const event = new Event('submit', { cancelable: true });
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            
            form.dispatchEvent(event);
            
            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        test('should validate on blur when live validation enabled', () => {
            validator.addRule('email', { required: true });
            const field = form.querySelector('#email');
            
            const spy = jest.spyOn(validator, 'handleFieldBlur');
            field.dispatchEvent(new Event('blur'));
            
            expect(spy).toHaveBeenCalledWith(field);
        });
    });
});

describe('FormValidator - Custom Rules', () => {
    let form;
    let validator;

    beforeEach(() => {
        document.body.innerHTML = `
            <form id="custom-form">
                <input type="text" id="custom" name="custom">
            </form>
        `;
        
        form = document.getElementById('custom-form');
        validator = new FormValidator();
        validator.init(form);
    });

    test('should support custom validation functions', () => {
        const customValidator = (value) => {
            return value === 'valid' ? [] : ['Custom validation failed'];
        };
        
        validator.addRule('custom', customValidator);
        
        const errors = validator.validateField(
            form.querySelector('#custom'), 
            'invalid', 
            {}
        );
        
        expect(errors).toContain('Custom validation failed');
    });

    test('should support async validation', async () => {
        const asyncValidator = async (value) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(value === 'valid' ? [] : ['Async validation failed']);
                }, 10);
            });
        };
        
        validator.addRule('custom', asyncValidator);
        
        // This would need special handling for async validation
        const errors = await validator.validateField(
            form.querySelector('#custom'), 
            'invalid', 
            {}
        );
        
        expect(errors).toContain('Async validation failed');
    });
});