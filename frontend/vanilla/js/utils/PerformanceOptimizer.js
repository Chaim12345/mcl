/**
 * Frontend Performance Optimizer
 * Provides lazy loading, virtual scrolling, and DOM optimization utilities
 */

import { createElement } from './dom.js';
import loadingManager from './LoadingManager.js';

class PerformanceOptimizer {
    constructor() {
        this.observers = new Map();
        this.virtualScrollers = new Map();
        this.lazyComponents = new Map();
        this.performanceMetrics = {
            componentRenderTimes: new Map(),
            domOperations: 0,
            memoryUsage: [],
            renderFrames: []
        };
        
        this.init();
    }

    init() {
        this.setupPerformanceMonitoring();
        this.setupIntersectionObserver();
        this.setupMutationObserver();
    }

    // Lazy Loading System
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported, lazy loading disabled');
            return;
        }

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyComponent(entry.target);
                    }
                });
            },
            {
                rootMargin: '50px',
                threshold: 0.1
            }
        );
    }

    // Register a component for lazy loading
    registerLazyComponent(element, componentFactory, options = {}) {
        const id = this.generateId();
        
        this.lazyComponents.set(id, {
            element,
            componentFactory,
            options,
            loaded: false
        });

        element.dataset.lazyId = id;
        element.classList.add('lazy-component');
        
        // Add placeholder content
        if (options.placeholder) {
            element.innerHTML = options.placeholder;
        } else {
            element.innerHTML = loadingManager.getSkeletonHTML({
                type: options.skeletonType || 'card',
                lines: options.skeletonLines || 3
            });
        }

        this.intersectionObserver.observe(element);
        return id;
    }

    // Load a lazy component when it becomes visible
    async loadLazyComponent(element) {
        const lazyId = element.dataset.lazyId;
        const componentData = this.lazyComponents.get(lazyId);
        
        if (!componentData || componentData.loaded) return;

        try {
            componentData.loaded = true;
            this.intersectionObserver.unobserve(element);

            // Show loading state
            if (componentData.options.showLoading) {
                loadingManager.setComponentLoading(element, true);
            }

            // Load the component
            const startTime = performance.now();
            const component = await componentData.componentFactory();
            const loadTime = performance.now() - startTime;

            // Track performance
            this.trackComponentRenderTime(component.constructor.name, loadTime);

            // Mount the component
            element.classList.remove('lazy-component');
            if (componentData.options.showLoading) {
                loadingManager.setComponentLoading(element, false);
            }

            // Initialize component if it has an init method
            if (component && typeof component.init === 'function') {
                component.init();
            }

        } catch (error) {
            console.error('Failed to load lazy component:', error);
            element.innerHTML = `
                <div class="lazy-component-error">
                    <p>Failed to load component</p>
                    <button onclick="window.performanceOptimizer.retryLazyComponent('${lazyId}')">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    // Retry loading a failed lazy component
    retryLazyComponent(lazyId) {
        const componentData = this.lazyComponents.get(lazyId);
        if (componentData) {
            componentData.loaded = false;
            this.intersectionObserver.observe(componentData.element);
        }
    }

    // Virtual Scrolling System
    createVirtualScroller(container, options = {}) {
        const id = this.generateId();
        
        const virtualScroller = new VirtualScroller(container, {
            itemHeight: options.itemHeight || 50,
            renderItem: options.renderItem,
            getItemCount: options.getItemCount,
            getItemData: options.getItemData,
            overscan: options.overscan || 5,
            onScroll: options.onScroll,
            ...options
        });

        this.virtualScrollers.set(id, virtualScroller);
        return virtualScroller;
    }

    // DOM Optimization Utilities
    batchDOMUpdates(updates) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                const startTime = performance.now();
                
                // Batch all DOM updates together
                updates.forEach(update => {
                    try {
                        update();
                        this.performanceMetrics.domOperations++;
                    } catch (error) {
                        console.error('DOM update failed:', error);
                    }
                });

                const updateTime = performance.now() - startTime;
                this.trackRenderFrame(updateTime);
                
                resolve();
            });
        });
    }

    // Debounced DOM updates
    debouncedUpdate(key, updateFunction, delay = 16) {
        if (this.updateTimeouts && this.updateTimeouts.has(key)) {
            clearTimeout(this.updateTimeouts.get(key));
        }

        if (!this.updateTimeouts) {
            this.updateTimeouts = new Map();
        }

        const timeoutId = setTimeout(() => {
            updateFunction();
            this.updateTimeouts.delete(key);
        }, delay);

        this.updateTimeouts.set(key, timeoutId);
    }

    // Efficient list rendering with recycling
    createRecycledList(container, options = {}) {
        return new RecycledList(container, options);
    }

    // Performance Monitoring
    setupPerformanceMonitoring() {
        // Monitor memory usage
        if ('memory' in performance) {
            setInterval(() => {
                this.performanceMetrics.memoryUsage.push({
                    timestamp: Date.now(),
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                });

                // Keep only last 100 measurements
                if (this.performanceMetrics.memoryUsage.length > 100) {
                    this.performanceMetrics.memoryUsage.shift();
                }
            }, 5000);
        }

        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        if (entry.duration > 50) {
                            console.warn(`Long task detected: ${entry.duration}ms`);
                        }
                    });
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                // PerformanceObserver might not support longtask
            }
        }
    }

    setupMutationObserver() {
        if (!('MutationObserver' in window)) return;

        this.mutationObserver = new MutationObserver((mutations) => {
            let domChanges = 0;
            mutations.forEach(mutation => {
                domChanges += mutation.addedNodes.length + mutation.removedNodes.length;
            });
            
            if (domChanges > 50) {
                console.warn(`High DOM mutation rate: ${domChanges} changes`);
            }
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });
    }

    // Performance Metrics
    trackComponentRenderTime(componentName, renderTime) {
        if (!this.performanceMetrics.componentRenderTimes.has(componentName)) {
            this.performanceMetrics.componentRenderTimes.set(componentName, []);
        }
        
        const times = this.performanceMetrics.componentRenderTimes.get(componentName);
        times.push({
            timestamp: Date.now(),
            duration: renderTime
        });

        // Keep only last 50 measurements per component
        if (times.length > 50) {
            times.shift();
        }

        // Warn about slow components
        if (renderTime > 100) {
            console.warn(`Slow component render: ${componentName} took ${renderTime}ms`);
        }
    }

    trackRenderFrame(frameTime) {
        this.performanceMetrics.renderFrames.push({
            timestamp: Date.now(),
            duration: frameTime
        });

        // Keep only last 100 frames
        if (this.performanceMetrics.renderFrames.length > 100) {
            this.performanceMetrics.renderFrames.shift();
        }
    }

    // Image Optimization
    optimizeImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        images.forEach(img => {
            this.intersectionObserver.observe(img);
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
        });
    }

    // Lazy load images when they come into view
    loadLazyImage(img) {
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        }
    }

    // Resource Preloading
    preloadResources(resources) {
        resources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.url;
            link.as = resource.type || 'fetch';
            if (resource.crossorigin) {
                link.crossOrigin = resource.crossorigin;
            }
            document.head.appendChild(link);
        });
    }

    // Code Splitting Utilities
    async loadModule(modulePath) {
        try {
            const startTime = performance.now();
            const module = await import(modulePath);
            const loadTime = performance.now() - startTime;
            
            console.log(`Module ${modulePath} loaded in ${loadTime}ms`);
            return module;
        } catch (error) {
            console.error(`Failed to load module ${modulePath}:`, error);
            throw error;
        }
    }

    // Performance Analysis
    getPerformanceReport() {
        const report = {
            timestamp: Date.now(),
            componentRenderTimes: {},
            averageFrameTime: 0,
            memoryUsage: this.getLatestMemoryUsage(),
            domOperations: this.performanceMetrics.domOperations,
            recommendations: []
        };

        // Calculate component render averages
        this.performanceMetrics.componentRenderTimes.forEach((times, componentName) => {
            const average = times.reduce((sum, time) => sum + time.duration, 0) / times.length;
            report.componentRenderTimes[componentName] = {
                average,
                count: times.length,
                max: Math.max(...times.map(t => t.duration))
            };

            if (average > 50) {
                report.recommendations.push(`Component ${componentName} has slow average render time: ${average.toFixed(2)}ms`);
            }
        });

        // Calculate average frame time
        if (this.performanceMetrics.renderFrames.length > 0) {
            report.averageFrameTime = this.performanceMetrics.renderFrames
                .reduce((sum, frame) => sum + frame.duration, 0) / this.performanceMetrics.renderFrames.length;

            if (report.averageFrameTime > 16) {
                report.recommendations.push(`Average frame time is high: ${report.averageFrameTime.toFixed(2)}ms (target: <16ms)`);
            }
        }

        // Memory recommendations
        if (report.memoryUsage && report.memoryUsage.used > report.memoryUsage.total * 0.8) {
            report.recommendations.push('High memory usage detected - consider optimizing component lifecycle');
        }

        return report;
    }

    getLatestMemoryUsage() {
        const latest = this.performanceMetrics.memoryUsage[this.performanceMetrics.memoryUsage.length - 1];
        return latest || null;
    }

    // Utility Methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Cleanup
    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        if (this.updateTimeouts) {
            this.updateTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.updateTimeouts.clear();
        }
        
        this.virtualScrollers.forEach(scroller => scroller.destroy());
        this.virtualScrollers.clear();
        this.lazyComponents.clear();
    }
}

// Virtual Scroller Implementation
class VirtualScroller {
    constructor(container, options) {
        this.container = container;
        this.options = {
            itemHeight: 50,
            overscan: 5,
            renderItem: () => '',
            getItemCount: () => 0,
            getItemData: (index) => ({ index }),
            ...options
        };

        this.scrollTop = 0;
        this.containerHeight = 0;
        this.renderedItems = new Map();
        this.itemPool = [];

        this.init();
    }

    init() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        
        this.viewport = createElement('div', {
            className: 'virtual-scroller-viewport',
            style: 'position: relative; width: 100%;'
        });
        
        this.container.appendChild(this.viewport);
        
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
        
        this.updateDimensions();
        this.render();
    }

    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.render();
        
        if (this.options.onScroll) {
            this.options.onScroll(this.scrollTop);
        }
    }

    handleResize() {
        this.updateDimensions();
        this.render();
    }

    updateDimensions() {
        this.containerHeight = this.container.clientHeight;
        const totalHeight = this.options.getItemCount() * this.options.itemHeight;
        this.viewport.style.height = `${totalHeight}px`;
    }

    render() {
        const itemCount = this.options.getItemCount();
        if (itemCount === 0) {
            this.viewport.innerHTML = '';
            return;
        }

        const startIndex = Math.floor(this.scrollTop / this.options.itemHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(this.containerHeight / this.options.itemHeight) + this.options.overscan,
            itemCount
        );

        const visibleStartIndex = Math.max(0, startIndex - this.options.overscan);
        const visibleEndIndex = endIndex;

        // Remove items that are no longer visible
        this.renderedItems.forEach((element, index) => {
            if (index < visibleStartIndex || index >= visibleEndIndex) {
                this.recycleItem(element);
                this.renderedItems.delete(index);
            }
        });

        // Add new visible items
        for (let i = visibleStartIndex; i < visibleEndIndex; i++) {
            if (!this.renderedItems.has(i)) {
                const element = this.createItem(i);
                this.renderedItems.set(i, element);
            }
        }
    }

    createItem(index) {
        let element = this.getPooledItem();
        
        if (!element) {
            element = createElement('div', {
                className: 'virtual-scroller-item',
                style: `position: absolute; width: 100%; height: ${this.options.itemHeight}px;`
            });
        }

        const itemData = this.options.getItemData(index);
        element.innerHTML = this.options.renderItem(itemData, index);
        element.style.top = `${index * this.options.itemHeight}px`;
        element.dataset.index = index;

        this.viewport.appendChild(element);
        return element;
    }

    getPooledItem() {
        return this.itemPool.pop() || null;
    }

    recycleItem(element) {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        this.itemPool.push(element);
    }

    scrollToIndex(index) {
        const targetScrollTop = index * this.options.itemHeight;
        this.container.scrollTop = targetScrollTop;
    }

    updateData() {
        this.updateDimensions();
        this.render();
    }

    destroy() {
        this.container.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        this.renderedItems.clear();
        this.itemPool = [];
    }
}

// Recycled List for efficient list rendering
class RecycledList {
    constructor(container, options) {
        this.container = container;
        this.options = {
            renderItem: () => '',
            keyExtractor: (item, index) => index,
            maxPoolSize: 20,
            ...options
        };

        this.itemPool = [];
        this.activeItems = new Map();
        this.data = [];
    }

    setData(newData) {
        this.data = newData;
        this.render();
    }

    render() {
        // Return all active items to pool
        this.activeItems.forEach(element => {
            this.recycleItem(element);
        });
        this.activeItems.clear();

        // Render new items
        this.data.forEach((item, index) => {
            const key = this.options.keyExtractor(item, index);
            const element = this.createItem(item, index);
            this.activeItems.set(key, element);
        });
    }

    createItem(item, index) {
        let element = this.getPooledItem();
        
        if (!element) {
            element = createElement('div', {
                className: 'recycled-list-item'
            });
        }

        element.innerHTML = this.options.renderItem(item, index);
        this.container.appendChild(element);
        
        return element;
    }

    getPooledItem() {
        return this.itemPool.pop() || null;
    }

    recycleItem(element) {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        
        if (this.itemPool.length < this.options.maxPoolSize) {
            this.itemPool.push(element);
        }
    }

    destroy() {
        this.activeItems.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        this.activeItems.clear();
        this.itemPool = [];
    }
}

// Create singleton instance
const performanceOptimizer = new PerformanceOptimizer();

// Make it globally available for debugging
if (typeof window !== 'undefined') {
    window.performanceOptimizer = performanceOptimizer;
}

export { PerformanceOptimizer, VirtualScroller, RecycledList };
export default performanceOptimizer;