/**
 * ErrorHandler - Centralized error handling system
 * Provides consistent error handling across the application
 */
class ErrorHandler {
  constructor() {
    this.handlers = new Map();
    this.defaultHandler = this.defaultErrorHandler.bind(this);
    
    // Register default handlers
    this.registerHandler('NETWORK_ERROR', this.networkErrorHandler);
    this.registerHandler('VALIDATION_ERROR', this.validationErrorHandler);
    this.registerHandler('AUTH_ERROR', this.authErrorHandler);
    
    // Setup global error handlers
    this.setupGlobalHandlers();
  }
  
  /**
   * Register a custom error handler for a specific error type
   * @param {string} errorType - The error type to handle
   * @param {function} handler - The handler function
   */
  registerHandler(errorType, handler) {
    this.handlers.set(errorType, handler);
  }
  
  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    // Handle uncaught exceptions
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, 'global');
      event.preventDefault();
      return true;
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason, 'promise');
      event.preventDefault();
    });
    
    // Handle API errors
    eventBus.on('api:error', (error, context) => {
      this.handle(error, context);
    });
  }
  
  /**
   * Handle an error
   * @param {Error|Object} error - The error object
   * @param {string} context - Context where error occurred
   */
  handle(error, context = 'unknown') {
    const errorType = error.type || this.determineErrorType(error);
    const handler = this.handlers.get(errorType) || this.defaultHandler;
    
    try {
      handler(error, context);
    } catch (handlerError) {
      // If handler itself throws an error, fall back to default handler
      this.defaultErrorHandler(handlerError, `Error in ${errorType} handler`);
      this.defaultErrorHandler(error, context);
    }
  }
  
  /**
   * Determine error type from error object
   * @param {Error} error - The error object
   * @returns {string} Error type
   */
  determineErrorType(error) {
    if (error.message && error.message.includes('NetworkError')) {
      return 'NETWORK_ERROR';
    }
    
    if (error.validationErrors) {
      return 'VALIDATION_ERROR';
    }
    
    if (error.status === 401 || error.status === 403) {
      return 'AUTH_ERROR';
    }
    
    return 'GENERAL_ERROR';
  }/**
   * Default error handler
   * @param {Error|Object} error - The error object
   * @param {string} context - Context where error occurred
   */
  defaultErrorHandler(error, context) {
    const errorMessage = error.message || 'An unexpected error occurred';
    console.error(`[ErrorHandler] Unhandled error in ${context}:`, error);
    
    this.showUserMessage('Something went wrong. Please try again.');
    this.reportErrorToServer(error, context);
  }

  /**
   * Network error handler
   * @param {Error|Object} error - The error object
   * @param {string} context - Context where error occurred
   */
  networkErrorHandler(error, context) {
    if (!navigator.onLine) {
      this.showUserMessage('You are offline. Changes will sync when connection is restored.', 'warning');
      return;
    }
    
    const status = error.status || (error.response && error.response.status);
    if (status === 401 || status === 403) {
      this.showUserMessage('Session expired. Please log in again.', 'warning');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }
    
    if (status === 429) {
      this.showUserMessage('Too many requests. Please wait a moment.', 'warning');
      return;
    }
    
    this.showUserMessage('Failed to connect to server. Please check your connection.', 'error');
    this.reportErrorToServer(error, context);
  }

  /**
   * Validation error handler
   * @param {Error|Object} error - The error object
   * @param {string} context - Context where error occurred
   */
  validationErrorHandler(error, context) {
    if (error.validationErrors) {
      // Show first validation error
      const firstError = Object.values(error.validationErrors)[0];
      this.showUserMessage(firstError, 'warning');
    } else {
      this.showUserMessage('Please check your input and try again.', 'warning');
    }
  }

  /**
   * Authentication error handler
   * @param {Error|Object} error - The error object
   * @param {string} context - Context where error occurred
   */
  authErrorHandler(error, context) {
    const status = error.status || (error.response && error.response.status);
    
    if (status === 401) {
      this.showUserMessage('Session expired. Please log in again.', 'warning');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else if (status === 403) {
      this.showUserMessage('You do not have permission to perform this action.', 'error');
    } else {
      this.showUserMessage('Authentication failed. Please check your credentials.', 'error');
    }
  }

  /**
   * Report error to server
   * @param {Error|Object} error - The error object
   * @param {string} context - Context where error occurred
   */
  reportErrorToServer(error, context) {
    if (navigator.onLine) {
      const errorData = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      
      // Send error report to server
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData),
        // Don't reject if reporting fails
        mode: 'no-cors'
      });
    }
  }

  /**
   * Show user-facing message
   * @param {string} message - Message to display
   * @param {string} type - Message type (info, success, warning, error)
   */
  showUserMessage(message, type = 'info') {
    // Emit event for UI components to handle
    eventBus.emit('notification:show', {
      message,
      type,
      duration: type === 'error' ? 8000 : 5000
    });
  }

  /**
   * Show enhanced error screen with details
   * @param {string} message - User-friendly message
   * @param {Error|Object} error - Original error object
   */
  showEnhancedError(message, error = null) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'enhanced-error-screen';
    
    errorContainer.innerHTML = `
      <div class="error-content">
        <div class="error-icon">😞</div>
        <h2 class="error-title">Oops! Something went wrong</h2>
        <p class="error-message">${message}</p>
        ${error ? `
        <details class="error-details">
          <summary>Technical Details</summary>
          <pre>${error.stack || error.message || error}</pre>
        </details>` : ''}
        <div class="error-actions">
          <button class="btn btn-primary error-action-retry">Try Again</button>
          <button class="btn btn-secondary error-action-home">Go Home</button>
        </div>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(errorContainer);
    
    // Setup action handlers
    const retryBtn = errorContainer.querySelector('.error-action-retry');
    const homeBtn = errorContainer.querySelector('.error-action-home');
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        document.body.removeChild(errorContainer);
        window.location.reload();
      });
    }
    
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        document.body.removeChild(errorContainer);
        window.location.href = '/';
      });
    }
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Export for legacy support
if (typeof window !== 'undefined') {
  window.errorHandler = errorHandler;
}