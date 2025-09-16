/**
 * Enhanced Loading Manager
 * Provides comprehensive loading states, skeleton screens, and progress indicators
 */

import { createElement, animate } from './dom.js';

class LoadingManager {
    constructor() {
        if (LoadingManager.instance) {
            return LoadingManager.instance;
        }
        
        this.overlay = null;
        this.loadingStates = new Map();
        this.progressBars = new Map();
        this.skeletonContainers = new Map();
        this.loadingQueue = new Set();
        
        this.init();
        LoadingManager.instance = this;
    }

    init() {
        this.createOverlay();
        this.injectStyles();
        this.setupGlobalLoadingIndicator();
    }

    createOverlay() {
        this.overlay = createElement('div', {
            id: 'global-loading-overlay',
            className: 'loading-overlay'
        });
        
        const spinner = createElement('div', {
            className: 'loading-spinner'
        }, `
            <div class="spinner-ring">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
            <div class="loading-text">Loading...</div>
        `);
        
        this.overlay.appendChild(spinner);
        document.body.appendChild(this.overlay);
    }

    injectStyles() {
        if (document.getElementById('loading-manager-styles')) return;

        const styles = createElement('style', { id: 'loading-manager-styles' }, `
            /* Global Loading Overlay */
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(2px);
            }

            .loading-overlay.show {
                display: flex;
            }

            /* Spinner Styles */
            .loading-spinner {
                text-align: center;
            }

            .spinner-ring {
                display: inline-block;
                position: relative;
                width: 64px;
                height: 64px;
            }

            .spinner-ring div {
                box-sizing: border-box;
                display: block;
                position: absolute;
                width: 51px;
                height: 51px;
                margin: 6px;
                border: 6px solid #3b82f6;
                border-radius: 50%;
                animation: spinner-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                border-color: #3b82f6 transparent transparent transparent;
            }

            .spinner-ring div:nth-child(1) { animation-delay: -0.45s; }
            .spinner-ring div:nth-child(2) { animation-delay: -0.3s; }
            .spinner-ring div:nth-child(3) { animation-delay: -0.15s; }

            @keyframes spinner-ring {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-text {
                margin-top: 16px;
                color: #4b5563;
                font-size: 14px;
                font-weight: 500;
            }

            /* Inline Loading Indicators */
            .loading-indicator {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                color: #6b7280;
                font-size: 14px;
            }

            .loading-indicator.small {
                font-size: 12px;
            }

            .loading-indicator.large {
                font-size: 16px;
            }

            .loading-dots {
                display: inline-flex;
                gap: 2px;
            }

            .loading-dot {
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: currentColor;
                animation: loading-dots 1.4s ease-in-out infinite both;
            }

            .loading-dot:nth-child(1) { animation-delay: -0.32s; }
            .loading-dot:nth-child(2) { animation-delay: -0.16s; }

            @keyframes loading-dots {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }

            .loading-spinner-small {
                width: 16px;
                height: 16px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Progress Bars */
            .progress-bar {
                width: 100%;
                height: 8px;
                background: #f3f4f6;
                border-radius: 4px;
                overflow: hidden;
                position: relative;
            }

            .progress-bar.thin {
                height: 4px;
            }

            .progress-bar.thick {
                height: 12px;
            }

            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #1d4ed8);
                border-radius: 4px;
                transition: width 0.3s ease;
                position: relative;
            }

            .progress-bar-fill.animated::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                right: 0;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255, 255, 255, 0.3),
                    transparent
                );
                animation: progress-shine 2s infinite;
            }

            @keyframes progress-shine {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            .progress-bar-indeterminate .progress-bar-fill {
                width: 30% !important;
                animation: progress-indeterminate 2s infinite;
            }

            @keyframes progress-indeterminate {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(400%); }
            }

            /* Skeleton Screens */
            .skeleton {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px;
            }

            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            .skeleton-text {
                height: 16px;
                margin-bottom: 8px;
            }

            .skeleton-text:last-child {
                margin-bottom: 0;
            }

            .skeleton-title {
                height: 24px;
                margin-bottom: 12px;
            }

            .skeleton-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
            }

            .skeleton-avatar.small {
                width: 24px;
                height: 24px;
            }

            .skeleton-avatar.large {
                width: 64px;
                height: 64px;
            }

            .skeleton-button {
                height: 36px;
                width: 100px;
                border-radius: 6px;
            }

            .skeleton-card {
                height: 120px;
                border-radius: 8px;
                margin-bottom: 16px;
            }

            .skeleton-table-row {
                height: 48px;
                margin-bottom: 1px;
            }

            .skeleton-image {
                height: 200px;
                border-radius: 8px;
            }

            /* Loading States for Components */
            .component-loading {
                position: relative;
                pointer-events: none;
                opacity: 0.6;
            }

            .component-loading::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
            }

            .component-loading::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                margin: -10px 0 0 -10px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                z-index: 11;
            }

            /* Button Loading States */
            .btn-loading {
                position: relative;
                pointer-events: none;
                color: transparent !important;
            }

            .btn-loading::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 16px;
                height: 16px;
                margin: -8px 0 0 -8px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            /* Form Loading States */
            .form-loading {
                position: relative;
            }

            .form-loading input,
            .form-loading textarea,
            .form-loading select {
                opacity: 0.6;
                pointer-events: none;
            }

            /* Table Loading States */
            .table-loading tbody {
                opacity: 0.6;
                pointer-events: none;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .loading-overlay {
                    background: rgba(255, 255, 255, 0.95);
                }
                
                .spinner-ring {
                    width: 48px;
                    height: 48px;
                }
                
                .spinner-ring div {
                    width: 38px;
                    height: 38px;
                    margin: 5px;
                    border-width: 4px;
                }
            }
        `);

        document.head.appendChild(styles);
    }

    setupGlobalLoadingIndicator() {
        // Create a small loading indicator for the top of the page
        const indicator = createElement('div', {
            id: 'global-loading-indicator',
            className: 'global-loading-indicator'
        });
        
        document.body.appendChild(indicator);
    }

    // Global Loading Methods
    showGlobalLoading(text = 'Loading...') {
        const textElement = this.overlay.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = text;
        }
        this.overlay.classList.add('show');
    }

    hideGlobalLoading() {
        this.overlay.classList.remove('show');
    }

    // Component Loading States
    setComponentLoading(element, loading = true) {
        if (loading) {
            element.classList.add('component-loading');
            this.loadingStates.set(element, true);
        } else {
            element.classList.remove('component-loading');
            this.loadingStates.delete(element);
        }
    }

    isComponentLoading(element) {
        return this.loadingStates.has(element);
    }

    // Button Loading States
    setButtonLoading(button, loading = true, originalText = null) {
        if (loading) {
            if (originalText === null) {
                originalText = button.textContent;
            }
            button.dataset.originalText = originalText;
            button.classList.add('btn-loading');
            button.disabled = true;
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    // Form Loading States
    setFormLoading(form, loading = true) {
        if (loading) {
            form.classList.add('form-loading');
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                this.setButtonLoading(submitButton, true);
            }
        } else {
            form.classList.remove('form-loading');
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                this.setButtonLoading(submitButton, false);
            }
        }
    }

    // Inline Loading Indicators
    createInlineLoader(size = 'medium') {
        const sizeClass = size !== 'medium' ? size : '';
        return createElement('span', {
            className: `loading-indicator ${sizeClass}`
        }, `
            <div class="loading-spinner-small"></div>
            <span>Loading...</span>
        `);
    }

    createDotsLoader(text = 'Loading') {
        return createElement('span', {
            className: 'loading-indicator'
        }, `
            <span>${text}</span>
            <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        `);
    }

    // Progress Bar Methods
    createProgressBar(options = {}) {
        const {
            id = this.generateId(),
            initialValue = 0,
            className = '',
            size = 'normal',
            animated = false,
            indeterminate = false
        } = options;

        const sizeClass = size !== 'normal' ? size : '';
        const animatedClass = animated ? 'animated' : '';
        const indeterminateClass = indeterminate ? 'indeterminate' : '';

        const progressBar = createElement('div', {
            className: `progress-bar ${sizeClass} ${indeterminateClass} ${className}`,
            dataset: { id }
        }, `
            <div class="progress-bar-fill ${animatedClass}" id="${id}" style="width: ${initialValue}%;"></div>
        `);

        this.progressBars.set(id, {
            container: progressBar,
            fill: progressBar.querySelector('.progress-bar-fill'),
            value: initialValue
        });

        return { element: progressBar, id };
    }

    updateProgressBar(id, value, animated = true) {
        const progressBar = this.progressBars.get(id);
        if (!progressBar) return;

        value = Math.max(0, Math.min(100, value));
        progressBar.value = value;

        if (animated) {
            progressBar.fill.style.transition = 'width 0.3s ease';
        } else {
            progressBar.fill.style.transition = 'none';
        }

        progressBar.fill.style.width = `${value}%`;
    }

    removeProgressBar(id) {
        const progressBar = this.progressBars.get(id);
        if (progressBar && progressBar.container.parentNode) {
            progressBar.container.parentNode.removeChild(progressBar.container);
        }
        this.progressBars.delete(id);
    }

    // Skeleton Screen Methods
    createSkeleton(options = {}) {
        const {
            type = 'text',
            lines = 1,
            width,
            height,
            className = '',
            size = 'normal'
        } = options;

        let skeletonClass = `skeleton skeleton-${type}`;
        if (size !== 'normal') skeletonClass += ` ${size}`;
        if (className) skeletonClass += ` ${className}`;

        let style = '';
        if (width) style += `width: ${width};`;
        if (height) style += `height: ${height};`;

        if (type === 'text' && lines > 1) {
            const container = createElement('div', { className, style });
            for (let i = 0; i < lines; i++) {
                const lineWidth = i === lines - 1 ? '80%' : '100%';
                const line = createElement('div', {
                    className: 'skeleton skeleton-text',
                    style: `width: ${lineWidth};`
                });
                container.appendChild(line);
            }
            return container;
        }

        return createElement('div', {
            className: skeletonClass,
            style
        });
    }

    showSkeleton(container, skeletonConfig) {
        const id = this.generateId();
        const skeleton = this.createSkeletonLayout(skeletonConfig);
        
        // Store original content
        this.skeletonContainers.set(id, {
            container,
            originalContent: container.innerHTML,
            skeleton
        });

        container.innerHTML = '';
        container.appendChild(skeleton);
        
        return id;
    }

    hideSkeleton(id) {
        const skeletonData = this.skeletonContainers.get(id);
        if (!skeletonData) return;

        const { container, originalContent } = skeletonData;
        container.innerHTML = originalContent;
        this.skeletonContainers.delete(id);
    }

    createSkeletonLayout(config) {
        const container = createElement('div', { className: 'skeleton-container' });
        
        config.forEach(item => {
            const skeleton = this.createSkeleton(item);
            container.appendChild(skeleton);
        });

        return container;
    }

    // Predefined Skeleton Layouts
    getSkeletonLayouts() {
        return {
            card: [
                { type: 'image', height: '200px' },
                { type: 'title' },
                { type: 'text', lines: 3 }
            ],
            list: [
                { type: 'text', lines: 1 },
                { type: 'text', lines: 1 },
                { type: 'text', lines: 1 }
            ],
            profile: [
                { type: 'avatar', size: 'large' },
                { type: 'title' },
                { type: 'text', lines: 2 }
            ],
            table: [
                { type: 'table-row' },
                { type: 'table-row' },
                { type: 'table-row' },
                { type: 'table-row' }
            ],
            dashboard: [
                { type: 'title' },
                { type: 'card' },
                { type: 'text', lines: 2 },
                { type: 'button' }
            ]
        };
    }

    // Async Operation Wrapper
    async wrapAsyncOperation(operation, options = {}) {
        const {
            globalLoading = false,
            loadingText = 'Loading...',
            component = null,
            button = null,
            form = null,
            progressCallback = null,
            onError = null
        } = options;

        try {
            // Start loading states
            if (globalLoading) this.showGlobalLoading(loadingText);
            if (component) this.setComponentLoading(component, true);
            if (button) this.setButtonLoading(button, true);
            if (form) this.setFormLoading(form, true);

            // Execute operation with progress tracking
            let result;
            if (progressCallback) {
                result = await this.trackProgress(operation, progressCallback);
            } else {
                result = await operation();
            }

            return result;
        } catch (error) {
            if (onError) {
                onError(error);
            } else {
                throw error;
            }
        } finally {
            // Clean up loading states
            if (globalLoading) this.hideGlobalLoading();
            if (component) this.setComponentLoading(component, false);
            if (button) this.setButtonLoading(button, false);
            if (form) this.setFormLoading(form, false);
        }
    }

    async trackProgress(operation, progressCallback) {
        // This would need to be implemented based on the specific operation
        // For now, just execute the operation
        return await operation();
    }

    // Queue Management
    addToQueue(operationId) {
        this.loadingQueue.add(operationId);
        this.updateGlobalLoadingState();
    }

    removeFromQueue(operationId) {
        this.loadingQueue.delete(operationId);
        this.updateGlobalLoadingState();
    }

    updateGlobalLoadingState() {
        const indicator = document.getElementById('global-loading-indicator');
        if (indicator) {
            if (this.loadingQueue.size > 0) {
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    // Utility Methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Cleanup
    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        
        this.loadingStates.clear();
        this.progressBars.clear();
        this.skeletonContainers.clear();
        this.loadingQueue.clear();
        
        LoadingManager.instance = null;
    }
}

// Create singleton instance
const loadingManager = new LoadingManager();

// Export both the class and the instance
export { LoadingManager };
export default loadingManager;