/**
 * Frontend Performance Tests
 */

import performanceOptimizer, { VirtualScroller, RecycledList } from '../utils/PerformanceOptimizer.js';
import { PerformantComponent, withPerformanceOptimizations, measureRender, memoize, throttle, debounce } from '../components/PerformantComponent.js';

// Mock DOM environment for testing
function setupTestDOM() {
    if (typeof document === 'undefined') {
        global.document = {
            createElement: (tag) => ({
                tagName: tag.toUpperCase(),
                style: {},
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                    contains: jest.fn(() => false)
                },
                appendChild: jest.fn(),
                removeChild: jest.fn(),
                querySelector: jest.fn(),
                querySelectorAll: jest.fn(() => []),
                innerHTML: '',
                textContent: '',
                dataset: {},
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            }),
            body: { 
                appendChild: jest.fn(),
                contains: jest.fn(() => true)
            },
            head: { appendChild: jest.fn() },
            getElementById: jest.fn(),
            querySelectorAll: jest.fn(() => [])
        };
        
        global.window = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
            cancelAnimationFrame: jest.fn(),
            performance: {
                now: jest.fn(() => Date.now()),
                memory: {
                    usedJSHeapSize: 1000000,
                    totalJSHeapSize: 2000000,
                    jsHeapSizeLimit: 4000000
                }
            },
            IntersectionObserver: jest.fn(() => ({
                observe: jest.fn(),
                unobserve: jest.fn(),
                disconnect: jest.fn()
            })),
            ResizeObserver: jest.fn(() => ({
                observe: jest.fn(),
                unobserve: jest.fn(),
                disconnect: jest.fn()
            })),
            MutationObserver: jest.fn(() => ({
                observe: jest.fn(),
                disconnect: jest.fn()
            }))
        };
        
        global.requestAnimationFrame = global.window.requestAnimationFrame;
        global.cancelAnimationFrame = global.window.cancelAnimationFrame;
        global.performance = global.window.performance;
    }
}

describe('PerformanceOptimizer', () => {
    beforeEach(() => {
        setupTestDOM();
    });

    describe('Lazy Loading', () => {
        test('should register lazy components', () => {
            const element = document.createElement('div');
            const componentFactory = jest.fn(() => Promise.resolve({}));
            
            const id = performanceOptimizer.registerLazyComponent(element, componentFactory);
            
            expect(id).toBeDefined();
            expect(element.dataset.lazyId).toBe(id);
            expect(element.classList.add).toHaveBeenCalledWith('lazy-component');
        });

        test('should load lazy component when visible', async () => {
            const element = document.createElement('div');
            const mockComponent = { init: jest.fn() };
            const componentFactory = jest.fn(() => Promise.resolve(mockComponent));
            
            performanceOptimizer.registerLazyComponent(element, componentFactory);
            await performanceOptimizer.loadLazyComponent(element);
            
            expect(componentFactory).toHaveBeenCalled();
            expect(mockComponent.init).toHaveBeenCalled();
            expect(element.classList.remove).toHaveBeenCalledWith('lazy-component');
        });

        test('should handle lazy component loading errors', async () => {
            const element = document.createElement('div');
            const componentFactory = jest.fn(() => Promise.reject(new Error('Load failed')));
            
            performanceOptimizer.registerLazyComponent(element, componentFactory);
            await performanceOptimizer.loadLazyComponent(element);
            
            expect(element.innerHTML).toContain('Failed to load component');
        });
    });

    describe('Virtual Scrolling', () => {
        test('should create virtual scroller', () => {
            const container = document.createElement('div');
            const options = {
                itemHeight: 50,
                renderItem: (data) => `<div>${data.text}</div>`,
                getItemCount: () => 100,
                getItemData: (index) => ({ text: `Item ${index}` })
            };
            
            const scroller = performanceOptimizer.createVirtualScroller(container, options);
            
            expect(scroller).toBeInstanceOf(VirtualScroller);
        });

        test('should handle virtual scroller scroll events', () => {
            const container = document.createElement('div');
            const onScroll = jest.fn();
            
            const scroller = new VirtualScroller(container, {
                itemHeight: 50,
                onScroll,
                getItemCount: () => 100
            });
            
            scroller.handleScroll();
            expect(onScroll).toHaveBeenCalled();
        });
    });

    describe('DOM Optimization', () => {
        test('should batch DOM updates', async () => {
            const updates = [
                jest.fn(),
                jest.fn(),
                jest.fn()
            ];
            
            await performanceOptimizer.batchDOMUpdates(updates);
            
            updates.forEach(update => {
                expect(update).toHaveBeenCalled();
            });
        });

        test('should debounce updates', (done) => {
            const updateFunction = jest.fn();
            
            performanceOptimizer.debouncedUpdate('test', updateFunction, 50);
            performanceOptimizer.debouncedUpdate('test', updateFunction, 50);
            performanceOptimizer.debouncedUpdate('test', updateFunction, 50);
            
            setTimeout(() => {
                expect(updateFunction).toHaveBeenCalledTimes(1);
                done();
            }, 100);
        });
    });

    describe('Performance Monitoring', () => {
        test('should track component render times', () => {
            const componentName = 'TestComponent';
            const renderTime = 25.5;
            
            performanceOptimizer.trackComponentRenderTime(componentName, renderTime);
            
            const report = performanceOptimizer.getPerformanceReport();
            expect(report.componentRenderTimes[componentName]).toBeDefined();
            expect(report.componentRenderTimes[componentName].average).toBe(renderTime);
        });

        test('should generate performance report', () => {
            performanceOptimizer.trackComponentRenderTime('Component1', 10);
            performanceOptimizer.trackComponentRenderTime('Component2', 50);
            
            const report = performanceOptimizer.getPerformanceReport();
            
            expect(report.timestamp).toBeDefined();
            expect(report.componentRenderTimes).toBeDefined();
            expect(report.recommendations).toBeInstanceOf(Array);
        });

        test('should provide recommendations for slow components', () => {
            performanceOptimizer.trackComponentRenderTime('SlowComponent', 100);
            
            const report = performanceOptimizer.getPerformanceReport();
            
            expect(report.recommendations.length).toBeGreaterThan(0);
            expect(report.recommendations[0]).toContain('SlowComponent');
        });
    });
});

describe('PerformantComponent', () => {
    beforeEach(() => {
        setupTestDOM();
    });

    test('should create performant component', () => {
        const element = document.createElement('div');
        const component = new PerformantComponent(element);
        
        expect(component).toBeInstanceOf(PerformantComponent);
        expect(component.performanceOptions).toBeDefined();
    });

    test('should schedule renders with throttling', (done) => {
        const element = document.createElement('div');
        const component = new PerformantComponent(element, {
            performance: { renderThrottle: 50 }
        });
        
        const originalRender = component.render;
        component.render = jest.fn(originalRender);
        
        // Trigger multiple state changes
        component.setState({ test: 1 });
        component.setState({ test: 2 });
        component.setState({ test: 3 });
        
        setTimeout(() => {
            // Should only render once due to throttling
            expect(component.render).toHaveBeenCalledTimes(1);
            done();
        }, 100);
    });

    test('should use memoization for renders', () => {
        const element = document.createElement('div');
        const component = new PerformantComponent(element, {
            performance: { enableMemoization: true }
        });
        
        // First render
        component.render();
        const firstHTML = element.innerHTML;
        
        // Second render with same state should use cache
        component.render();
        expect(element.innerHTML).toBe(firstHTML);
    });

    test('should enable virtual scrolling', () => {
        const element = document.createElement('div');
        element.innerHTML = '<div class="scroll-container"></div>';
        element.querySelector = jest.fn(() => element.children[0]);
        
        const component = new PerformantComponent(element, {
            performance: { enableVirtualScrolling: true }
        });
        
        const scroller = component.enableVirtualScrolling({
            itemHeight: 50,
            getItemCount: () => 100
        });
        
        expect(scroller).toBeDefined();
    });

    test('should render lists efficiently', () => {
        const element = document.createElement('div');
        const listContainer = document.createElement('div');
        element.appendChild(listContainer);
        
        const component = new PerformantComponent(element);
        const items = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        
        component.renderList(listContainer, items, (item) => `<div>${item.name}</div>`);
        
        // Should have rendered the list
        expect(listContainer.innerHTML).toContain('Item 0');
    });

    test('should measure performance', () => {
        const element = document.createElement('div');
        const component = new PerformantComponent(element);
        
        const operation = jest.fn(() => 'result');
        const result = component.measurePerformance(operation, 'Test Operation');
        
        expect(operation).toHaveBeenCalled();
        expect(result).toBe('result');
    });

    test('should provide performance report', () => {
        const element = document.createElement('div');
        const component = new PerformantComponent(element);
        
        const report = component.getPerformanceReport();
        
        expect(report.componentName).toBe('PerformantComponent');
        expect(report.performanceOptions).toBeDefined();
    });
});

describe('Performance Decorators', () => {
    beforeEach(() => {
        setupTestDOM();
    });

    test('measureRender decorator should track render times', () => {
        class TestComponent {
            @measureRender
            render() {
                return 'rendered';
            }
        }
        
        const component = new TestComponent();
        const result = component.render();
        
        expect(result).toBe('rendered');
    });

    test('memoize decorator should cache results', () => {
        class TestComponent {
            callCount = 0;
            
            @memoize
            expensiveOperation(input) {
                this.callCount++;
                return `result-${input}`;
            }
        }
        
        const component = new TestComponent();
        
        const result1 = component.expensiveOperation('test');
        const result2 = component.expensiveOperation('test');
        
        expect(result1).toBe('result-test');
        expect(result2).toBe('result-test');
        expect(component.callCount).toBe(1); // Should only be called once
    });

    test('throttle decorator should limit function calls', (done) => {
        class TestComponent {
            callCount = 0;
            
            @throttle(50)
            throttledMethod() {
                this.callCount++;
            }
        }
        
        const component = new TestComponent();
        
        // Call multiple times rapidly
        component.throttledMethod();
        component.throttledMethod();
        component.throttledMethod();
        
        setTimeout(() => {
            expect(component.callCount).toBe(1);
            done();
        }, 100);
    });

    test('debounce decorator should delay function calls', (done) => {
        class TestComponent {
            callCount = 0;
            
            @debounce(50)
            debouncedMethod() {
                this.callCount++;
            }
        }
        
        const component = new TestComponent();
        
        // Call multiple times rapidly
        component.debouncedMethod();
        component.debouncedMethod();
        component.debouncedMethod();
        
        setTimeout(() => {
            expect(component.callCount).toBe(1);
            done();
        }, 100);
    });
});

describe('RecycledList', () => {
    beforeEach(() => {
        setupTestDOM();
    });

    test('should create recycled list', () => {
        const container = document.createElement('div');
        const list = new RecycledList(container, {
            renderItem: (item) => `<div>${item.name}</div>`
        });
        
        expect(list).toBeInstanceOf(RecycledList);
    });

    test('should render data efficiently', () => {
        const container = document.createElement('div');
        const list = new RecycledList(container, {
            renderItem: (item) => `<div>${item.name}</div>`,
            keyExtractor: (item) => item.id
        });
        
        const data = [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' }
        ];
        
        list.setData(data);
        
        expect(container.appendChild).toHaveBeenCalled();
    });

    test('should recycle items efficiently', () => {
        const container = document.createElement('div');
        const list = new RecycledList(container, {
            renderItem: (item) => `<div>${item.name}</div>`,
            maxPoolSize: 5
        });
        
        // Set initial data
        list.setData([{ id: 1, name: 'Item 1' }]);
        
        // Change data to trigger recycling
        list.setData([{ id: 2, name: 'Item 2' }]);
        
        expect(list.itemPool.length).toBeGreaterThan(0);
    });
});

// Performance Benchmarks
describe('Performance Benchmarks', () => {
    beforeEach(() => {
        setupTestDOM();
    });

    test('virtual scrolling performance', () => {
        const container = document.createElement('div');
        const startTime = performance.now();
        
        const scroller = new VirtualScroller(container, {
            itemHeight: 50,
            renderItem: (data) => `<div>Item ${data.index}</div>`,
            getItemCount: () => 10000,
            getItemData: (index) => ({ index })
        });
        
        const creationTime = performance.now() - startTime;
        
        expect(creationTime).toBeLessThan(100); // Should create quickly
        expect(scroller).toBeDefined();
    });

    test('batch update performance', async () => {
        const updates = Array.from({ length: 100 }, () => jest.fn());
        const startTime = performance.now();
        
        await performanceOptimizer.batchDOMUpdates(updates);
        
        const batchTime = performance.now() - startTime;
        
        expect(batchTime).toBeLessThan(50); // Should batch efficiently
        updates.forEach(update => expect(update).toHaveBeenCalled());
    });

    test('component render performance', () => {
        const element = document.createElement('div');
        const component = new PerformantComponent(element);
        
        const startTime = performance.now();
        
        // Perform multiple renders
        for (let i = 0; i < 100; i++) {
            component.setState({ counter: i });
        }
        
        const renderTime = performance.now() - startTime;
        
        expect(renderTime).toBeLessThan(200); // Should render efficiently with throttling
    });
});

// Integration Tests
describe('Performance Integration', () => {
    beforeEach(() => {
        setupTestDOM();
    });

    test('should integrate lazy loading with virtual scrolling', () => {
        const container = document.createElement('div');
        const element = document.createElement('div');
        container.appendChild(element);
        
        // Register lazy component
        const componentFactory = () => Promise.resolve({
            init: () => {
                // Create virtual scroller when lazy loaded
                return performanceOptimizer.createVirtualScroller(element, {
                    itemHeight: 50,
                    getItemCount: () => 1000
                });
            }
        });
        
        const lazyId = performanceOptimizer.registerLazyComponent(element, componentFactory);
        
        expect(lazyId).toBeDefined();
        expect(element.classList.add).toHaveBeenCalledWith('lazy-component');
    });

    test('should work with performance-enhanced components', () => {
        const element = document.createElement('div');
        
        class TestComponent extends PerformantComponent {
            template() {
                return `<div>Test Component - ${this.state.counter || 0}</div>`;
            }
        }
        
        const component = new TestComponent(element, {
            performance: {
                enableMemoization: true,
                enableBatchUpdates: true
            }
        });
        
        component.mount();
        component.setState({ counter: 1 });
        
        expect(component.getPerformanceReport().componentName).toBe('TestComponent');
    });
});

// Manual testing functions for browser environment
if (typeof window !== 'undefined') {
    window.performanceTests = {
        testVirtualScrolling: () => {
            const container = document.createElement('div');
            container.style.cssText = 'height: 400px; width: 100%; border: 1px solid #ccc; margin: 20px;';
            document.body.appendChild(container);
            
            const scroller = performanceOptimizer.createVirtualScroller(container, {
                itemHeight: 50,
                renderItem: (data, index) => `
                    <div style="height: 50px; padding: 10px; border-bottom: 1px solid #eee;">
                        Item ${index}: ${data.text}
                    </div>
                `,
                getItemCount: () => 10000,
                getItemData: (index) => ({ text: `Large dataset item ${index}` })
            });
            
            console.log('Virtual scroller created with 10,000 items');
        },
        
        testLazyLoading: () => {
            const container = document.createElement('div');
            container.style.cssText = 'height: 200px; margin: 20px; border: 1px solid #ccc;';
            document.body.appendChild(container);
            
            performanceOptimizer.registerLazyComponent(
                container,
                () => {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            container.innerHTML = '<h3>Lazy loaded content!</h3><p>This was loaded when it became visible.</p>';
                            resolve({ init: () => console.log('Lazy component initialized') });
                        }, 1000);
                    });
                },
                { showLoading: true }
            );
            
            console.log('Lazy component registered - scroll to see it load');
        },
        
        testPerformanceReport: () => {
            // Generate some performance data
            performanceOptimizer.trackComponentRenderTime('TestComponent1', 15);
            performanceOptimizer.trackComponentRenderTime('TestComponent2', 75);
            performanceOptimizer.trackComponentRenderTime('SlowComponent', 150);
            
            const report = performanceOptimizer.getPerformanceReport();
            console.log('Performance Report:', report);
        }
    };
    
    console.log('Performance test functions available:', Object.keys(window.performanceTests));
    console.log('Try: performanceTests.testVirtualScrolling()');
}