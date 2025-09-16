/**
 * Error Display Component
 * Provides accessible error message display with ARIA support
 */

export class ErrorDisplay {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      ariaLive: 'polite',
      role: 'alert',
      showIcon: true,
      autoClear: true,
      timeout: 10000,
      ...options
    };
    
    this.messageContainer = null;
    this.timeoutIds = new Set();
    this.init();
  }

  init() {
    this.createContainer();
  }

  createContainer() {
    if (this.messageContainer) return;

    this.messageContainer = document.createElement('div');
    this.messageContainer.className = 'error-display-container';
    this.messageContainer.setAttribute('aria-live', this.options.ariaLive);
    this.messageContainer.setAttribute('role', this.options.role);
    this.messageContainer.setAttribute('aria-atomic', 'true');
    
    // Add styles for accessibility
    this.messageContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      width: 100%;
    `;

    this.container.appendChild(this.messageContainer);
  }

  show(messages) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    messages.forEach(message => {
      this.displayMessage(message);
    });
  }

  displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `error-message error-message--${message.type || 'error'}`;
    messageElement.setAttribute('role', 'alert');
    messageElement.setAttribute('aria-live', 'assertive');
    
    // Add ARIA attributes
    messageElement.setAttribute('aria-atomic', 'true');
    
    // Create content
    const content = document.createElement('div');
    content.className = 'error-message-content';
    
    if (this.options.showIcon) {
      const icon = this.createIcon(message.type);
      content.appendChild(icon);
    }
    
    const text = document.createElement('span');
    text.className = 'error-message-text';
    text.textContent = message.message;
    text.setAttribute('aria-label', message.message);
    
    content.appendChild(text);
    
    // Add close button for accessibility
    const closeButton = document.createElement('button');
    closeButton.className = 'error-message-close';
    closeButton.innerHTML = '&times;';
    closeButton.setAttribute('aria-label', 'Close error message');
    closeButton.addEventListener('click', () => this.removeMessage(messageElement));
    
    messageElement.appendChild(content);
    messageElement.appendChild(closeButton);
    
    // Add keyboard support
    messageElement.setAttribute('tabindex', '0');
    messageElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.removeMessage(messageElement);
      }
    });
    
    this.messageContainer.appendChild(messageElement);
    
    // Auto-remove if enabled
    if (this.options.autoClear && message.duration !== false) {
      const timeout = message.duration || this.options.timeout;
      const timeoutId = setTimeout(() => {
        this.removeMessage(messageElement);
      }, timeout);
      
      this.timeoutIds.add(timeoutId);
    }
    
    // Focus management for screen readers
    setTimeout(() => {
      messageElement.focus();
    }, 100);
  }

  createIcon(type) {
    const icon = document.createElement('span');
    icon.className = 'error-message-icon';
    icon.setAttribute('aria-hidden', 'true');
    
    switch (type) {
      case 'success':
        icon.innerHTML = '✓';
        break;
      case 'warning':
        icon.innerHTML = '⚠';
        break;
      case 'info':
        icon.innerHTML = 'ℹ';
        break;
      default:
        icon.innerHTML = '×';
    }
    
    return icon;
  }

  removeMessage(element) {
    if (element && element.parentNode) {
      element.style.animation = 'slideOutRight 0.3s ease-out forwards';
      
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, 300);
    }
  }

  clear() {
    // Clear all pending timeouts
    this.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeoutIds.clear();
    
    // Remove all messages
    if (this.messageContainer) {
      this.messageContainer.innerHTML = '';
    }
  }

  destroy() {
    this.clear();
    if (this.messageContainer && this.messageContainer.parentNode) {
      this.messageContainer.parentNode.removeChild(this.messageContainer);
    }
    this.messageContainer = null;
  }
}

// Add CSS styles for the error display
const style = document.createElement('style');
style.textContent = `
.error-display-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.error-message {
  display: flex;
  align-items: flex-start;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px 16px;
  max-width: 100%;
  pointer-events: auto;
  transition: all 0.3s ease;
  animation: slideInRight 0.3s ease-out;
}

.error-message--error {
  border-left: 4px solid #ef4444;
  background-color: #fef2f2;
}

.error-message--warning {
  border-left: 4px solid #f59e0b;
  background-color: #fffbeb;
}

.error-message--success {
  border-left: 4px solid #10b981;
  background-color: #f0fdf4;
}

.error-message--info {
  border-left: 4px solid #3b82f6;
  background-color: #eff6ff;
}

.error-message-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
}

.error-message-icon {
  font-size: 16px;
  font-weight: bold;
  margin-top: 2px;
}

.error-message-text {
  font-size: 14px;
  line-height: 1.4;
  color: #374151;
  margin: 0;
}

.error-message-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  color: #6b7280;
  transition: color 0.2s;
}

.error-message-close:hover {
  color: #374151;
}

.error-message-close:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 2px;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@media (max-width: 640px) {
  .error-message {
    margin: 0 16px;
    max-width: calc(100% - 32px);
  }
}
`;

if (!document.querySelector('#error-display-styles')) {
  style.id = 'error-display-styles';
  document.head.appendChild(style);
}