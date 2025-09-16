/**
 * Performant Component Base Class
 * Extends the base Component with performance optimizations
 */

import { Component } from './base/Component.js';
import performanceOptimizer from '../utils/PerformanceOptimizer.js';

export class PerformantComponent extends Component {
    constructor(element, options = {}) {
        super(element, options);
        
        this.performanceOptions = {
            enableVirtualScrolling: false,
            enableLazyRendering: false,
            enableMemoization: true,
            enableBatchUpdates: true,
            renderThrottle: 16, // 60fps
            ...options.performance
        };

        this.renderCache = new Map();
        this.pendingUpdates = new Set();
        this.lastRenderTime = 0;
        this.renderRequestId = null;
        
        this.setupPerformanceOptimizations();
    }

    setupPerformanceOptimizations() {
        // Override setState to use batched updates
        const originalSetState = this.setState;
        this.setState = (newState, shouldRender = true) => {
            originalSetState.call(this, newState, false); // Don't render immediately
            
            if (shouldRender && this.performanceOptions.enableBatchUpdates) {
                this.scheduleRender();
            } else if (shouldRender) {
                this.render();
            }
        };

        // Override render to use throttling and memoization
        const originalRender = this.render;
        this.render = () => {
            if (this.performanceOptions.enableMemoization) {
                const stateHash = this.getStateHash();
                if (this.renderCache.has(stateHash)) {
                    const cachedResult = this.renderCache.get(stateHash);
                    this.element.innerHTML = cachedResult;
                    this.afterRender();
                    return this;
                }
            }

            const startTime = performance.now();
            const result = originalRender.call(this);
            const renderTime = performance.now() - startTime;

            // Track render performance
            performanceOptimizer.trackComponentRenderTime(this.constructor.name, renderTime);

            // Cache the result if memoization is enabled
            if (this.performanceOptions.enableMemoization) {
                const stateHash = this.getStateHash();
                this.renderCache.set(stateHash, this.element.innerHTML);
                
                // Limit cache size
                if (this.renderCache.size > 10) {
                    const firstKey = this.renderCache.keys().next().value;
                    this.renderCache.delete(firstKey);
                }
            }

            return result;
        };
    }

    // Throttled render scheduling
    scheduleRender() {
        if (this.renderRequestId) return;

        const now = performance.now();
        const timeSinceLastRender = now - this.lastRenderTime;
        
        if (timeSinceLastRender >= this.performanceOptions.renderThrottle) {
            this.renderRequestId = requestAnimationFrame(() => {
                this.render();
                this.lastRenderTime = performance.now();
                this.renderRequestId = null;
            });
        } else {
            const delay = this.performanceOptions.renderThrottle - timeSinceLastRender;
            this.renderRequestId = setTimeout(() => {
                this.renderRequestId = requestAnimationFrame(() => {
                    this.render();
                    this.lastRenderTime = performance.now();
                    this.renderRequestId = null;
                });
            }, delay);
        }
    }

    // Generate a hash of the current state for memoization
    getStateHash() {
        try {
            return JSON.stringify(this.state);
        } catch (error) {
            // Fallback for circular references
            return Object.keys(this.state).join(',') + Date.now();
        }
    }

    // Batch DOM updates
    batchUpdate(updateFunction) {
        return performanceOptimizer.batchDOMUpdates([updateFunction]);
    }

    // Debounced update method
    debouncedUpdate(key, updateFunction, delay = 100) {
        performanceOptimizer.debouncedUpdate(
            `${this.constructor.name}_${key}`, 
            updateFunction, 
            delay
        );
    }

    // Virtual scrolling support
    enableVirtualScrolling(options = {}) {
        if (!this.performanceOptions.enableVirtualScrolling) return null;

        const scrollContainer = this.find(options.container || '.scroll-container');
        if (!scrollContainer) {
            console.warn('Virtual scrolling container not found');
            return null;
        }

        return performanceOptimizer.createVirtualScroller(scrollContainer, {
            itemHeight: options.itemHeight || 50,
            renderItem: options.renderItem || this.renderVirtualItem.bind(this),
            getItemCount: options.getItemCount || (() => this.getVirtualItemCount()),
            getItemData: options.getItemData || ((index) => this.getVirtualItemData(index)),
            ...options
        });
    }

    // Override these methods in subclasses for virtual scrolling
    renderVirtualItem(data, index) {
        return `<div>Item ${index}</div>`;
    }

    getVirtualItemCount() {
        return 0;
    }

    getVirtualItemData(index) {
        return { index };
    }

    // Lazy rendering support
    enableLazyRendering(options = {}) {
        if (!this.performanceOptions.enableLazyRendering) return;

        const lazyElements = this.findAll(options.selector || '.lazy-render');
        
        lazyElements.forEach(element => {
            performanceOptimizer.registerLazyComponent(
                element,
                () => this.renderLazyContent(element),
                {
                    placeholder: options.placeholder,
                    skeletonType: options.skeletonType || 'text',
                    skeletonLines: options.skeletonLines || 2,
                    showLoading: options.showLoading !== false
                }
            );
        });
    }

    // Override this method in subclasses for lazy rendering
    async renderLazyContent(element) {
        return element;
    }

    // Efficient list rendering
    renderList(container, items, renderItem, options = {}) {
        const listContainer = typeof container === 'string' ? this.find(container) : container;
        if (!listContainer) return;

        // Use virtual scrolling for large lists
        if (items.length > (options.virtualThreshold || 100) && this.performanceOptions.enableVirtualScrolling) {
            return performanceOptimizer.createVirtualScroller(listContainer, {
                itemHeight: options.itemHeight || 50,
                renderItem: (data, index) => renderItem(data, index),
                getItemCount: () => items.length,
                getItemData: (index) => items[index],
                ...options
            });
        }

        // Use recycled list for medium lists
        if (items.length > (options.recycleThreshold || 20)) {
            const recycledList = performanceOptimizer.createRecycledList(listContainer, {
                renderItem: (item, index) => renderItem(item, index),
                keyExtractor: options.keyExtractor || ((item, index) => index),
                ...options
            });
            recycledList.setData(items);
            return recycledList;
        }

        // Regular rendering for small lists
        return this.batchUpdate(() => {
            listContainer.innerHTML = items.map((item, index) => renderItem(item, index)).join('');
        });
    }

    // Optimized event delegation
    delegateEvent(selector, event, handler) {
        const delegatedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && this.element.contains(target)) {
                handler.call(this, e, target);
            }
        };

        this.addEventListener(this.element, event, delegatedHandler);
        return delegatedHandler;
    }

    // Memory-efficient data binding
    bindData(selector, data, template) {
        const elements = this.findAll(selector);
        
        return this.batchUpdate(() => {
            elements.forEach(element => {
                element.innerHTML = this.interpolateTemplate(template, data);
            });
        });
    }

    // Simple template interpolation
    interpolateTemplate(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || '';
        });
    }

    // Intersection observer for visibility-based optimizations
    observeVisibility(callback, options = {}) {
        if (!('IntersectionObserver' in window)) {
            callback(true); // Assume visible if not supported
            return null;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    callback(entry.isIntersecting, entry);
                });
            },
            {
                threshold: options.threshold || 0.1,
                rootMargin: options.rootMargin || '0px',
                ...options
            }
        );

        observer.observe(this.element);
        return observer;
    }

    // Resize observer for responsive optimizations
    observeResize(callback) {
        if (!('ResizeObserver' in window)) {
            window.addEventListener('resize', callback);
            return null;
        }

        const observer = new ResizeObserver((entries) => {
            entries.forEach(entry => {
                callback(entry.contentRect, entry);
            });
        });

        observer.observe(this.element);
        return observer;
    }

    // Performance measurement
    measurePerformance(operation, label) {
        const startTime = performance.now();
        const result = operation();
        const duration = performance.now() - startTime;
        
        console.log(`${label || 'Operation'} took ${duration.toFixed(2)}ms`);
        
        if (duration > 16) {
            console.warn(`Slow operation detected: ${label} (${duration.toFixed(2)}ms)`);
        }
        
        return result;
    }

    // Async performance measurement
    async measureAsyncPerformance(operation, label) {
        const startTime = performance.now();
        const result = await operation();
        const duration = performance.now() - startTime;
        
        console.log(`${label || 'Async Operation'} took ${duration.toFixed(2)}ms`);
        
        if (duration > 100) {
            console.warn(`Slow async operation detected: ${label} (${duration.toFixed(2)}ms)`);
        }
        
        return result;
    }

    // Component-specific performance report
    getPerformanceReport() {
        return {
            componentName: this.constructor.name,
            renderCacheSize: this.renderCache.size,
            lastRenderTime: this.lastRenderTime,
            pendingUpdates: this.pendingUpdates.size,
            performanceOptions: this.performanceOptions
        };
    }

    // Cleanup optimizations
    unmount() {
        // Cancel pending renders
        if (this.renderRequestId) {
            if (typeof this.renderRequestId === 'number') {
                cancelAnimationFrame(this.renderRequestId);
            } else {
                clearTimeout(this.renderRequestId);
            }
        }

        // Clear caches
        this.renderCache.clear();
        this.pendingUpdates.clear();

        // Call parent unmount
        super.unmount();
    }
}

// Higher-order function to add performance optimizations to existing components
export function withPerformanceOptimizations(ComponentClass, performanceOptions = {}) {
    return class PerformanceEnhancedComponent extends ComponentClass {
        constructor(element, options = {}) {
            super(element, {
                ...options,
                performance: {
                    ...performanceOptions,
                    ...options.performance
                }
            });

            // Mix in performance methods
            Object.getOwnPropertyNames(PerformantComponent.prototype)
                .filter(name => name !== 'constructor' && !name.startsWith('_'))
                .forEach(name => {
                    if (typeof PerformantComponent.prototype[name] === 'function' && !this[name]) {
                        this[name] = PerformantComponent.prototype[name].bind(this);
                    }
                });

            // Initialize performance optimizations
            if (this.setupPerformanceOptimizations) {
                this.setupPerformanceOptimizations();
            }
        }
    };
}

// Performance monitoring decorator
export function measureRender(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args) {
        const startTime = performance.now();
        const result = originalMethod.apply(this, args);
        const duration = performance.now() - startTime;

        performanceOptimizer.trackComponentRenderTime(
            this.constructor.name + '.' + propertyKey, 
            duration
        );

        if (duration > 16) {
            console.warn(`Slow render method: ${this.constructor.name}.${propertyKey} (${duration.toFixed(2)}ms)`);
        }

        return result;
    };

    return descriptor;
}

// Memoization decorator
export function memoize(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const cache = new Map();

    descriptor.value = function(...args) {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = originalMethod.apply(this, args);
        cache.set(key, result);

        // Limit cache size
        if (cache.size > 100) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }

        return result;
    };

    return descriptor;
}

// Throttle decorator
export function throttle(delay = 16) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        let lastCall = 0;
        let timeoutId = null;

        descriptor.value = function(...args) {
            const now = Date.now();
            
            if (now - lastCall >= delay) {
                lastCall = now;
                return originalMethod.apply(this, args);
            } else {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    lastCall = Date.now();
                    originalMethod.apply(this, args);
                }, delay - (now - lastCall));
            }
        };

        return descriptor;
    };
}

// Debounce decorator
export function debounce(delay = 100) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        let timeoutId = null;

        descriptor.value = function(...args) {
            if (timeoutId) clearTimeout(timeoutId);
            
            timeoutId = setTimeout(() => {
                originalMethod.apply(this, args);
            }, delay);
        };

        return descriptor;
    };
}