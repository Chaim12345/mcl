/**
 * Production-Ready CSS Styles
 * Mobile-first, touch-friendly, accessible styles
 */

const productionCSS = `
/* Import Design System */
@import url('./design-system.css');

/* Base Styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--font-family-sans);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--gray-900);
  background-color: var(--gray-50);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 44px;
  min-width: 44px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.btn:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-500);
  color: white;
  border-color: var(--primary-500);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-600);
  border-color: var(--primary-600);
}

.btn-primary:active:not(:disabled) {
  background-color: var(--primary-700);
  border-color: var(--primary-700);
}

.btn-secondary {
  background-color: var(--gray-100);
  color: var(--gray-700);
  border-color: var(--gray-200);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--gray-200);
  border-color: var(--gray-300);
}

.btn-outline {
  background-color: transparent;
  color: var(--primary-600);
  border-color: var(--primary-500);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--primary-50);
  border-color: var(--primary-600);
}

.btn-ghost {
  background-color: transparent;
  color: var(--gray-600);
  border-color: transparent;
}

.btn-ghost:hover:not(:disabled) {
  background-color: var(--gray-100);
  color: var(--gray-700);
}

.btn-danger {
  background-color: var(--error-500);
  color: white;
  border-color: var(--error-500);
}

.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
  border-color: #dc2626;
}

.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
  min-height: 36px;
}

.btn-lg {
  padding: var(--space-4) var(--space-6);
  font-size: var(--font-size-base);
  min-height: 52px;
}

.btn-loading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.btn-icon {
  display: flex;
  align-items: center;
}

/* Input Styles */
.input-group {
  margin-bottom: var(--space-4);
}

.input-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--gray-700);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  background-color: white;
  transition: all var(--transition-fast);
  min-height: 44px;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.input-field:disabled {
  background-color: var(--gray-100);
  color: var(--gray-500);
  cursor: not-allowed;
}

.input-field::placeholder {
  color: var(--gray-400);
}

.input-icon {
  position: absolute;
  left: var(--space-3);
  color: var(--gray-400);
  pointer-events: none;
}

.input-field:has(+ .input-icon) {
  padding-left: var(--space-10);
}

.input-error {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--error-500);
}

.input-help {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--gray-500);
}

/* Card Styles */
.card {
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-content {
  padding: var(--space-6);
}

.card-title {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--gray-900);
}

.card-subtitle {
  margin: 0 0 var(--space-4) 0;
  font-size: var(--font-size-sm);
  color: var(--gray-600);
}

.card-body {
  margin-bottom: var(--space-4);
  color: var(--gray-700);
}

.card-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal-container {
  position: relative;
  background-color: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease;
}

.modal-sm .modal-container {
  width: 400px;
}

.modal-md .modal-container {
  width: 500px;
}

.modal-lg .modal-container {
  width: 700px;
}

.modal-xl .modal-container {
  width: 900px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-200);
}

.modal-title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--gray-900);
}

.modal-close {
  background: none;
  border: none;
  font-size: var(--font-size-xl);
  color: var(--gray-400);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background-color: var(--gray-100);
  color: var(--gray-600);
}

.modal-body {
  padding: var(--space-6);
  max-height: 60vh;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding: var(--space-6);
  border-top: 1px solid var(--gray-200);
  background-color: var(--gray-50);
}

.modal-closing .modal-container {
  animation: modalSlideOut 0.3s ease;
}

/* Toast Styles */
.toast-container {
  position: fixed;
  top: var(--space-4);
  right: var(--space-4);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 400px;
}

.toast {
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: toastSlideIn 0.3s ease;
}

.toast-success {
  border-left: 4px solid var(--success-500);
}

.toast-error {
  border-left: 4px solid var(--error-500);
}

.toast-warning {
  border-left: 4px solid var(--warning-500);
}

.toast-info {
  border-left: 4px solid var(--info-500);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
}

.toast-icon {
  font-size: var(--font-size-lg);
}

.toast-message {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--gray-700);
}

.toast-close {
  background: none;
  border: none;
  color: var(--gray-400);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.toast-close:hover {
  background-color: var(--gray-100);
  color: var(--gray-600);
}

.toast-progress {
  height: 3px;
  background-color: var(--gray-200);
  animation: toastProgress 5s linear;
}

.toast-success .toast-progress {
  background-color: var(--success-500);
}

.toast-error .toast-progress {
  background-color: var(--error-500);
}

.toast-warning .toast-progress {
  background-color: var(--warning-500);
}

.toast-info .toast-progress {
  background-color: var(--info-500);
}

.toast-removing {
  animation: toastSlideOut 0.3s ease;
}

/* Dropdown Styles */
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  cursor: pointer;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-dropdown);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all var(--transition-fast);
}

.dropdown-menu.dropdown-open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom: 1px solid var(--gray-100);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: var(--gray-50);
}

.dropdown-icon {
  font-size: var(--font-size-sm);
  color: var(--gray-500);
}

.dropdown-text {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--gray-700);
}

.dropdown-shortcut {
  font-size: var(--font-size-xs);
  color: var(--gray-400);
  font-family: var(--font-family-mono);
}

/* Spinner Styles */
.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--gray-200);
  border-top: 2px solid var(--primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border-width: 1px;
}

.spinner-lg {
  width: 32px;
  height: 32px;
  border-width: 3px;
}

.spinner-text {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
}

/* Progress Bar Styles */
.progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-500);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.progress-sm .progress-bar {
  height: 4px;
}

.progress-lg .progress-bar {
  height: 12px;
}

.progress-label {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  text-align: center;
}

/* Touch Interactions */
.touch-active {
  transform: scale(0.98);
  opacity: 0.8;
}

/* Animations */
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modalSlideOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toastSlideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

@keyframes toastProgress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Skip Link */
.skip-link {
  position: absolute;
  top: -100px;
  left: var(--space-4);
  background-color: var(--primary-500);
  color: white;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  z-index: var(--z-tooltip);
  transition: all var(--transition-fast);
}

.skip-link:focus {
  top: var(--space-4);
}

/* Mobile Optimizations */
@media (max-width: 768px) {
  .modal {
    padding: var(--space-2);
  }
  
  .modal-container {
    max-width: 95vw;
    max-height: 95vh;
  }
  
  .modal-sm .modal-container,
  .modal-md .modal-container,
  .modal-lg .modal-container,
  .modal-xl .modal-container {
    width: 100%;
  }
  
  .toast-container {
    top: var(--space-2);
    right: var(--space-2);
    left: var(--space-2);
    max-width: none;
  }
  
  .card-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .btn {
    border-width: 2px;
  }
  
  .input-field {
    border-width: 2px;
  }
  
  .card {
    border-width: 2px;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// Inject the production CSS
const productionStyleSheet = document.createElement('style');
productionStyleSheet.textContent = productionCSS;
document.head.appendChild(productionStyleSheet);
