/**
 * Loading Aware Component
 * Base component that integrates with LoadingManager for loading states
 */

import { Component } from './base/Component.js';
import loadingManager from '../utils/LoadingManager.js';
import { handleError } from '../utils/errors.js';

export class LoadingAwareComponent extends Component {
    get defaultOptions() {
        return {
            ...super.defaultOptions,
            showLoadingOnMount: false,
            skeletonLayout: null,
            loadingText: 'Loading...',
            enableProgressTracking: false
        };
    }

    get initialState() {
        return {
            ...super.initialState,
            isLoading: false,
            loadingOperations: new Set(),
            skeletonId: null,
            progressBars: new Map()
        };
    }

    init() {
        super.init();
        
        if (this.options.showLoadingOnMount) {
            this.showLoading();
        }
    }

    // Loading State Management
    showLoading(text = this.options.loadingText) {
        if (this.state.isLoading) return;

        this.setState({ isLoading: true });
        
        if (this.options.skeletonLayout) {
            this.showSkeleton();
        } else {
            loadingManager.setComponentLoading(this.element, true);
        }

        this.onLoadingStart(text);
    }

    hideLoading() {
        if (!this.state.isLoading) return;

        this.setState({ isLoading: false });
        
        if (this.state.skeletonId) {
            this.hideSkeleton();
        } else {
            loadingManager.setComponentLoading(this.element, false);
        }

        this.onLoadingEnd();
    }

    showSkeleton() {
        if (this.state.skeletonId) return;

        const layout = this.options.skeletonLayout || this.getDefaultSkeletonLayout();
        const skeletonId = loadingManager.showSkeleton(this.element, layout);
        
        this.setState({ skeletonId });
    }

    hideSkeleton() {
        if (!this.state.skeletonId) return;

        loadingManager.hideSkeleton(this.state.skeletonId);
        this.setState({ skeletonId: null });
    }

    getDefaultSkeletonLayout() {
        // Override in subclasses for custom skeleton layouts
        return [
            { type: 'text', lines: 2 },
            { type: 'button' }
        ];
    }

    // Async Operation Wrapper
    async executeAsync(operation, options = {}) {
        const {
            showLoading = true,
            loadingText = this.options.loadingText,
            operationId = this.generateOperationId(),
            onProgress = null,
            onError = null
        } = options;

        try {
            // Track operation
            this.state.loadingOperations.add(operationId);
            
            if (showLoading) {
                this.showLoading(loadingText);
            }

            // Execute with progress tracking if enabled
            let result;
            if (onProgress && this.options.enableProgressTracking) {
                result = await this.executeWithProgress(operation, onProgress, operationId);
            } else {
                result = await operation();
            }

            return result;
        } catch (error) {
            if (onError) {
                onError(error);
            } else {
                handleError(error, {
                    context: {
                        component: this.constructor.name,
                        operationId
                    }
                });
            }
            throw error;
        } finally {
            // Clean up
            this.state.loadingOperations.delete(operationId);
            
            if (showLoading && this.state.loadingOperations.size === 0) {
                this.hideLoading();
            }
        }
    }

    async executeWithProgress(operation, onProgress, operationId) {
        // Create progress bar
        const { element: progressElement, id: progressId } = loadingManager.createProgressBar({
            animated: true,
            indeterminate: false
        });

        // Add progress bar to component
        const progressContainer = this.createProgressContainer();
        progressContainer.appendChild(progressElement);
        this.element.appendChild(progressContainer);

        this.state.progressBars.set(operationId, {
            progressId,
            container: progressContainer
        });

        try {
            // Execute operation with progress callback
            const result = await operation((progress) => {
                loadingManager.updateProgressBar(progressId, progress);
                onProgress(progress);
            });

            return result;
        } finally {
            // Clean up progress bar
            this.removeProgressBar(operationId);
        }
    }

    createProgressContainer() {
        const container = document.createElement('div');
        container.className = 'component-progress-container';
        container.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 8px;
            background: rgba(255, 255, 255, 0.9);
            border-top: 1px solid #e5e7eb;
        `;
        return container;
    }

    removeProgressBar(operationId) {
        const progressData = this.state.progressBars.get(operationId);
        if (!progressData) return;

        const { progressId, container } = progressData;
        
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
        
        loadingManager.removeProgressBar(progressId);
        this.state.progressBars.delete(operationId);
    }

    // Button Loading States
    setButtonLoading(selector, loading = true, text = null) {
        const button = this.find(selector);
        if (button) {
            loadingManager.setButtonLoading(button, loading, text);
        }
    }

    // Form Loading States
    setFormLoading(selector, loading = true) {
        const form = this.find(selector);
        if (form) {
            loadingManager.setFormLoading(form, loading);
        }
    }

    // Inline Loading Indicators
    showInlineLoader(selector, size = 'medium') {
        const container = this.find(selector);
        if (!container) return;

        const loader = loadingManager.createInlineLoader(size);
        container.innerHTML = '';
        container.appendChild(loader);
    }

    showDotsLoader(selector, text = 'Loading') {
        const container = this.find(selector);
        if (!container) return;

        const loader = loadingManager.createDotsLoader(text);
        container.innerHTML = '';
        container.appendChild(loader);
    }

    hideInlineLoader(selector, originalContent = '') {
        const container = this.find(selector);
        if (container) {
            container.innerHTML = originalContent;
        }
    }

    // Lifecycle Hooks
    onLoadingStart(text) {
        // Override in subclasses
        this.emit('loading:start', { text });
    }

    onLoadingEnd() {
        // Override in subclasses
        this.emit('loading:end');
    }

    // Utility Methods
    generateOperationId() {
        return `${this.constructor.name}-${Date.now()}-${Math.random().toString(36).substr(2)}`;
    }

    isLoading() {
        return this.state.isLoading;
    }

    hasActiveOperations() {
        return this.state.loadingOperations.size > 0;
    }

    getActiveOperations() {
        return Array.from(this.state.loadingOperations);
    }

    // Cleanup
    unmount() {
        // Clean up loading states
        if (this.state.isLoading) {
            this.hideLoading();
        }

        // Clean up progress bars
        this.state.progressBars.forEach((_, operationId) => {
            this.removeProgressBar(operationId);
        });

        super.unmount();
    }
}

// Higher-order function to add loading capabilities to existing components
export function withLoadingCapabilities(ComponentClass, loadingOptions = {}) {
    return class LoadingEnhancedComponent extends ComponentClass {
        constructor(element, options = {}) {
            super(element, {
                ...options,
                ...loadingOptions
            });
            
            // Mix in loading methods
            Object.getOwnPropertyNames(LoadingAwareComponent.prototype)
                .filter(name => name !== 'constructor')
                .forEach(name => {
                    if (typeof LoadingAwareComponent.prototype[name] === 'function') {
                        this[name] = LoadingAwareComponent.prototype[name].bind(this);
                    }
                });

            // Initialize loading state
            this.state = {
                ...this.state,
                isLoading: false,
                loadingOperations: new Set(),
                skeletonId: null,
                progressBars: new Map()
            };
        }
    };
}

// Decorator for async methods to automatically handle loading states
export function withLoading(options = {}) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function(...args) {
            const {
                showLoading = true,
                loadingText = 'Loading...',
                onError = null
            } = options;

            if (this.executeAsync) {
                return this.executeAsync(
                    () => originalMethod.apply(this, args),
                    { showLoading, loadingText, onError }
                );
            } else {
                // Fallback for components without loading capabilities
                return originalMethod.apply(this, args);
            }
        };

        return descriptor;
    };
}

// Example usage component
export class ExampleLoadingComponent extends LoadingAwareComponent {
    get defaultOptions() {
        return {
            ...super.defaultOptions,
            skeletonLayout: [
                { type: 'title' },
                { type: 'text', lines: 3 },
                { type: 'avatar', size: 'large' },
                { type: 'button' }
            ]
        };
    }

    template() {
        return `
            <div class="example-component">
                <h2>Loading Aware Component Example</h2>
                <div class="content">
                    <p>This component demonstrates loading states.</p>
                    <button class="load-data-btn">Load Data</button>
                    <button class="load-with-progress-btn">Load with Progress</button>
                    <div class="data-container"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.addEventListener(this.find('.load-data-btn'), 'click', this.loadData);
        this.addEventListener(this.find('.load-with-progress-btn'), 'click', this.loadWithProgress);
    }

    @withLoading({ loadingText: 'Loading data...', showLoading: true })
    async loadData() {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const container = this.find('.data-container');
        container.innerHTML = '<p>Data loaded successfully!</p>';
    }

    async loadWithProgress() {
        await this.executeAsync(
            (progressCallback) => {
                return new Promise(resolve => {
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += 10;
                        progressCallback(progress);
                        
                        if (progress >= 100) {
                            clearInterval(interval);
                            resolve('Complete!');
                        }
                    }, 200);
                });
            },
            {
                showLoading: true,
                loadingText: 'Loading with progress...',
                onProgress: (progress) => {
                    console.log(`Progress: ${progress}%`);
                }
            }
        );

        const container = this.find('.data-container');
        container.innerHTML = '<p>Data loaded with progress tracking!</p>';
    }

    getDefaultSkeletonLayout() {
        return [
            { type: 'title' },
            { type: 'text', lines: 2 },
            { type: 'button' },
            { type: 'button' }
        ];
    }
}