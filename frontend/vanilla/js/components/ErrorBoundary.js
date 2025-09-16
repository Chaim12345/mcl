/**
 * Error Boundary Component
 * Wraps other components to catch and handle errors gracefully
 */

import { Component } from './base/Component.js';
import { handleError, wrapComponent } from '../utils/errors.js';

export class ErrorBoundary extends Component {
    get defaultOptions() {
        return {
            fallbackMessage: 'Something went wrong',
            showReload: true,
            showDetails: false,
            onError: null
        };
    }

    get initialState() {
        return {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    init() {
        // Set up error catching for child components
        this.originalRender = this.render;
        this.render = this.safeRender.bind(this);
    }

    safeRender() {
        try {
            if (this.state.hasError) {
                return this.renderError();
            }
            return this.originalRender();
        } catch (error) {
            this.catchError(error);
            return this.renderError();
        }
    }

    catchError(error, errorInfo = {}) {
        this.setState({
            hasError: true,
            error,
            errorInfo
        });

        // Log the error
        handleError(error, {
            context: {
                component: this.constructor.name,
                errorBoundary: true,
                ...errorInfo
            }
        });

        // Call custom error handler if provided
        if (this.options.onError) {
            this.options.onError(error, errorInfo);
        }
    }

    renderError() {
        const { error } = this.state;
        const { fallbackMessage, showReload, showDetails } = this.options;

        return `
            <div class="error-boundary">
                <div class="error-boundary-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <div class="error-boundary-content">
                    <h3 class="error-boundary-title">${fallbackMessage}</h3>
                    <p class="error-boundary-message">
                        ${error?.message || 'An unexpected error occurred while rendering this component.'}
                    </p>
                    <div class="error-boundary-actions">
                        ${showReload ? '<button class="error-boundary-action" data-action="reload">Reload Page</button>' : ''}
                        <button class="error-boundary-action secondary" data-action="retry">Try Again</button>
                        ${showDetails ? '<button class="error-boundary-action secondary" data-action="details">Show Details</button>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener(this.element, 'click', this.handleAction);
    }

    handleAction(event) {
        const action = event.target.dataset.action;
        if (!action) return;

        switch (action) {
            case 'reload':
                window.location.reload();
                break;
            case 'retry':
                this.retry();
                break;
            case 'details':
                this.showDetails();
                break;
        }
    }

    retry() {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    }

    showDetails() {
        const { error, errorInfo } = this.state;
        console.group('Error Boundary Details');
        console.error('Error:', error);
        console.log('Error Info:', errorInfo);
        console.log('Component:', this.constructor.name);
        console.groupEnd();
    }

    // Static method to wrap any component with error boundary
    static wrap(ComponentClass, options = {}) {
        return class WrappedComponent extends ErrorBoundary {
            constructor(element, componentOptions = {}) {
                super(element, options);
                this.wrappedComponent = null;
                this.componentOptions = componentOptions;
                this.ComponentClass = ComponentClass;
            }

            originalRender() {
                if (!this.wrappedComponent) {
                    this.wrappedComponent = new this.ComponentClass(this.element, this.componentOptions);
                }
                return this.wrappedComponent.render();
            }

            unmount() {
                if (this.wrappedComponent) {
                    this.wrappedComponent.unmount();
                }
                super.unmount();
            }
        };
    }
}

// Higher-order function to wrap component classes
export function withErrorBoundary(ComponentClass, errorBoundaryOptions = {}) {
    return ErrorBoundary.wrap(ComponentClass, errorBoundaryOptions);
}

// Decorator-style wrapper for methods
export function catchErrors(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args) {
        try {
            const result = originalMethod.apply(this, args);
            
            // Handle async methods
            if (result && typeof result.catch === 'function') {
                return result.catch(error => {
                    handleError(error, {
                        context: {
                            component: this.constructor.name,
                            method: propertyKey,
                            args: args.length
                        }
                    });
                    throw error;
                });
            }
            
            return result;
        } catch (error) {
            handleError(error, {
                context: {
                    component: this.constructor.name,
                    method: propertyKey,
                    args: args.length
                }
            });
            throw error;
        }
    };

    return descriptor;
}

// Utility function to safely execute component operations
export function safeExecute(operation, fallback = null, context = {}) {
    try {
        const result = operation();
        
        // Handle promises
        if (result && typeof result.catch === 'function') {
            return result.catch(error => {
                handleError(error, { context });
                return fallback;
            });
        }
        
        return result;
    } catch (error) {
        handleError(error, { context });
        return fallback;
    }
}