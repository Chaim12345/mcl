/**
 * Password Reset Confirmation Page
 * Handles the password reset confirmation process
 */

import { api } from '../services/api.js';
import { showNotification } from '../utils/notifications.js';
import { validatePassword, getPasswordStrength } from '../validation/password.js';

class PasswordResetConfirm {
    constructor() {
        this.form = null;
        this.passwordInput = null;
        this.confirmPasswordInput = null;
        this.resetButton = null;
        this.token = null;
        
        this.init();
    }

    init() {
        // Hide loading screen
        this.hideLoadingScreen();
        
        // Get reset token from URL
        this.token = this.getResetTokenFromURL();
        
        if (!this.token) {
            this.showError('Invalid or missing reset token. Please request a new password reset.');
            return;
        }

        // Initialize form elements
        this.initializeElements();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize password strength indicator
        this.initializePasswordStrength();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    getResetTokenFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token');
    }

    initializeElements() {
        this.form = document.getElementById('password-reset-form');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirm-password');
        this.resetButton = document.getElementById('reset-button');
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Password visibility toggles
        this.setupPasswordToggle('toggle-password', 'password');
        this.setupPasswordToggle('toggle-confirm-password', 'confirm-password');
        
        // Password strength indicator
        this.passwordInput.addEventListener('input', () => this.updatePasswordStrength());
        
        // Password confirmation validation
        this.confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
        
        // Real-time validation
        this.passwordInput.addEventListener('blur', () => this.validatePasswordField());
        this.confirmPasswordInput.addEventListener('blur', () => this.validatePasswordMatch());
    }

    setupPasswordToggle(toggleId, inputId) {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(inputId);
        
        if (toggle && input) {
            toggle.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                toggle.querySelector('.toggle-icon').textContent = isPassword ? '🙈' : '👁️';
            });
        }
    }

    initializePasswordStrength() {
        this.updatePasswordStrength();
    }

    updatePasswordStrength() {
        const password = this.passwordInput.value;
        const strength = getPasswordStrength(password);
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');
        
        if (strengthFill && strengthText) {
            // Update strength bar
            strengthFill.style.width = `${strength.score * 25}%`;
            strengthFill.className = `strength-fill strength-${strength.level}`;
            
            // Update strength text
            strengthText.textContent = strength.message;
            strengthText.className = `strength-text strength-${strength.level}`;
        }
    }

    validatePasswordField() {
        const password = this.passwordInput.value;
        const validation = validatePassword(password);
        
        this.showFieldValidation('password', validation.isValid, validation.message);
        return validation.isValid;
    }

    validatePasswordMatch() {
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        if (!confirmPassword) {
            this.clearFieldValidation('confirm-password');
            return false;
        }
        
        const isMatch = password === confirmPassword;
        const message = isMatch ? 'Passwords match' : 'Passwords do not match';
        
        this.showFieldValidation('confirm-password', isMatch, message);
        return isMatch;
    }

    showFieldValidation(fieldId, isValid, message) {
        const field = document.getElementById(fieldId);
        const formGroup = field.closest('.form-group');
        
        // Remove existing validation classes
        formGroup.classList.remove('field-valid', 'field-invalid');
        
        // Remove existing validation message
        const existingMessage = formGroup.querySelector('.field-validation');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        if (message) {
            // Add validation class
            formGroup.classList.add(isValid ? 'field-valid' : 'field-invalid');
            
            // Add validation message
            const validationDiv = document.createElement('div');
            validationDiv.className = `field-validation ${isValid ? 'valid' : 'invalid'}`;
            validationDiv.textContent = message;
            formGroup.appendChild(validationDiv);
        }
    }

    clearFieldValidation(fieldId) {
        const field = document.getElementById(fieldId);
        const formGroup = field.closest('.form-group');
        
        formGroup.classList.remove('field-valid', 'field-invalid');
        
        const existingMessage = formGroup.querySelector('.field-validation');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate form
        const isPasswordValid = this.validatePasswordField();
        const isPasswordMatch = this.validatePasswordMatch();
        
        if (!isPasswordValid || !isPasswordMatch) {
            this.showFormMessage('Please fix the errors above', 'error');
            return;
        }
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            const formData = new FormData(this.form);
            const password = formData.get('password');
            
            // Call API to reset password
            await api.auth.confirmPasswordReset(this.token, password);
            
            // Show success modal
            this.showSuccessModal();
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            let errorMessage = 'An error occurred while resetting your password. Please try again.';
            
            if (error.response) {
                switch (error.response.status) {
                    case 400:
                        errorMessage = 'Invalid or expired reset token. Please request a new password reset.';
                        break;
                    case 422:
                        errorMessage = 'Password does not meet requirements. Please choose a stronger password.';
                        break;
                    case 429:
                        errorMessage = 'Too many attempts. Please try again later.';
                        break;
                }
            }
            
            this.showErrorModal(errorMessage);
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        const btnText = this.resetButton.querySelector('.btn-text');
        const btnLoading = this.resetButton.querySelector('.btn-loading');
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            this.resetButton.disabled = true;
            this.form.classList.add('form-loading');
        } else {
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
            this.resetButton.disabled = false;
            this.form.classList.remove('form-loading');
        }
    }

    showFormMessage(message, type = 'info') {
        const messageDiv = document.getElementById('form-message');
        messageDiv.textContent = message;
        messageDiv.className = `form-message ${type}`;
        messageDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    showSuccessModal() {
        const modal = document.getElementById('success-modal');
        modal.style.display = 'flex';
        
        // Focus on the button for accessibility
        const button = modal.querySelector('.btn-primary');
        if (button) {
            button.focus();
        }
    }

    showErrorModal(message) {
        const modal = document.getElementById('error-modal');
        const messageElement = document.getElementById('error-message');
        
        messageElement.textContent = message;
        modal.style.display = 'flex';
        
        // Focus on the button for accessibility
        const button = modal.querySelector('.btn-secondary');
        if (button) {
            button.focus();
        }
    }

    showError(message) {
        // Show error in form message area
        this.showFormMessage(message, 'error');
        
        // Disable form
        this.form.style.opacity = '0.5';
        this.form.style.pointerEvents = 'none';
        
        // Show link to request new reset
        const authFooter = document.querySelector('.auth-footer');
        if (authFooter) {
            authFooter.innerHTML = `
                <p>Need a new reset link? <a href="password-reset.html">Request password reset</a></p>
                <p><a href="login.html">Back to sign in</a></p>
            `;
        }
    }
}

// Global function to close modals
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PasswordResetConfirm());
} else {
    new PasswordResetConfirm();
}