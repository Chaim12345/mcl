/**
 * Loading Manager Tests
 */

import { LoadingManager } from '../utils/LoadingManager.js';

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
                    contains: jest.fn()
                },
                appendChild: jest.fn(),
                querySelector: jest.fn(),
                querySelectorAll: jest.fn(() => []),
                innerHTML: '',
                textContent: '',
                dataset: {},
                disabled: false
            }),
            body: { appendChild: jest.fn() },
            head: { appendChild: jest.fn() },
            getElementById: jest.fn(),
            readyState: 'complete'
        };
        global.window = {
            addEventListener: jest.fn()
        };
    }
}

describe('LoadingManager', () => {
    let loadingManager;

    beforeEach(() => {
        setupTestDOM();
        // Reset singleton
        LoadingManager.instance = null;
        loadingManager = new LoadingManager();
    });

    afterEach(() => {
        if (loadingManager) {
            loadingManager.destroy();
        }
    });

    describe('Singleton Pattern', () => {
        test('should return same instance', () => {
            const instance1 = new LoadingManager();
            const instance2 = new LoadingManager();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Global Loading', () => {
        test('should show global loading', () => {
            loadingManager.showGlobalLoading('Test loading...');
            expect(loadingManager.overlay.classList.add).toHaveBeenCalledWith('show');
        });

        test('should hide global loading', () => {
            loadingManager.hideGlobalLoading();
            expect(loadingManager.overlay.classList.remove).toHaveBeenCalledWith('show');
        });

        test('should update loading text', () => {
            const mockTextElement = { textContent: '' };
            loadingManager.overlay.querySelector = jest.fn(() => mockTextElement);
            
            loadingManager.showGlobalLoading('Custom loading text');
            expect(mockTextElement.textContent).toBe('Custom loading text');
        });
    });

    describe('Component Loading States', () => {
        test('should set component loading state', () => {
            const element = document.createElement('div');
            
            loadingManager.setComponentLoading(element, true);
            expect(element.classList.add).toHaveBeenCalledWith('component-loading');
            expect(loadingManager.isComponentLoading(element)).toBe(true);
        });

        test('should remove component loading state', () => {
            const element = document.createElement('div');
            
            loadingManager.setComponentLoading(element, true);
            loadingManager.setComponentLoading(element, false);
            
            expect(element.classList.remove).toHaveBeenCalledWith('component-loading');
            expect(loadingManager.isComponentLoading(element)).toBe(false);
        });
    });

    describe('Button Loading States', () => {
        test('should set button loading state', () => {
            const button = document.createElement('button');
            button.textContent = 'Submit';
            
            loadingManager.setButtonLoading(button, true);
            
            expect(button.classList.add).toHaveBeenCalledWith('btn-loading');
            expect(button.disabled).toBe(true);
            expect(button.dataset.originalText).toBe('Submit');
        });

        test('should restore button from loading state', () => {
            const button = document.createElement('button');
            button.textContent = 'Submit';
            button.dataset = {};
            
            loadingManager.setButtonLoading(button, true);
            loadingManager.setButtonLoading(button, false);
            
            expect(button.classList.remove).toHaveBeenCalledWith('btn-loading');
            expect(button.disabled).toBe(false);
            expect(button.textContent).toBe('Submit');
        });
    });

    describe('Form Loading States', () => {
        test('should set form loading state', () => {
            const form = document.createElement('form');
            const submitButton = document.createElement('button');
            submitButton.type = 'submit';
            form.querySelector = jest.fn(() => submitButton);
            
            loadingManager.setFormLoading(form, true);
            
            expect(form.classList.add).toHaveBeenCalledWith('form-loading');
        });

        test('should remove form loading state', () => {
            const form = document.createElement('form');
            const submitButton = document.createElement('button');
            submitButton.type = 'submit';
            form.querySelector = jest.fn(() => submitButton);
            
            loadingManager.setFormLoading(form, true);
            loadingManager.setFormLoading(form, false);
            
            expect(form.classList.remove).toHaveBeenCalledWith('form-loading');
        });
    });

    describe('Inline Loaders', () => {
        test('should create inline loader', () => {
            const loader = loadingManager.createInlineLoader('small');
            expect(loader.classList.contains('loading-indicator')).toBe(true);
        });

        test('should create dots loader', () => {
            const loader = loadingManager.createDotsLoader('Processing');
            expect(loader.classList.contains('loading-indicator')).toBe(true);
        });
    });

    describe('Progress Bars', () => {
        test('should create progress bar', () => {
            const { element, id } = loadingManager.createProgressBar({
                initialValue: 25,
                animated: true
            });
            
            expect(element.classList.contains('progress-bar')).toBe(true);
            expect(loadingManager.progressBars.has(id)).toBe(true);
        });

        test('should update progress bar value', () => {
            const { id } = loadingManager.createProgressBar({ initialValue: 0 });
            
            loadingManager.updateProgressBar(id, 75);
            
            const progressBar = loadingManager.progressBars.get(id);
            expect(progressBar.value).toBe(75);
        });

        test('should clamp progress bar values', () => {
            const { id } = loadingManager.createProgressBar();
            
            loadingManager.updateProgressBar(id, 150); // Over 100
            expect(loadingManager.progressBars.get(id).value).toBe(100);
            
            loadingManager.updateProgressBar(id, -10); // Under 0
            expect(loadingManager.progressBars.get(id).value).toBe(0);
        });

        test('should remove progress bar', () => {
            const { id } = loadingManager.createProgressBar();
            
            loadingManager.removeProgressBar(id);
            expect(loadingManager.progressBars.has(id)).toBe(false);
        });
    });

    describe('Skeleton Screens', () => {
        test('should create text skeleton', () => {
            const skeleton = loadingManager.createSkeleton({
                type: 'text',
                lines: 1
            });
            
            expect(skeleton.classList.contains('skeleton')).toBe(true);
            expect(skeleton.classList.contains('skeleton-text')).toBe(true);
        });

        test('should create multi-line text skeleton', () => {
            const skeleton = loadingManager.createSkeleton({
                type: 'text',
                lines: 3
            });
            
            // Should create a container with multiple lines
            expect(skeleton.children.length).toBe(3);
        });

        test('should create avatar skeleton', () => {
            const skeleton = loadingManager.createSkeleton({
                type: 'avatar',
                size: 'large'
            });
            
            expect(skeleton.classList.contains('skeleton-avatar')).toBe(true);
            expect(skeleton.classList.contains('large')).toBe(true);
        });

        test('should show and hide skeleton', () => {
            const container = document.createElement('div');
            container.innerHTML = '<p>Original content</p>';
            
            const skeletonConfig = [
                { type: 'text', lines: 2 },
                { type: 'button' }
            ];
            
            const id = loadingManager.showSkeleton(container, skeletonConfig);
            expect(loadingManager.skeletonContainers.has(id)).toBe(true);
            
            loadingManager.hideSkeleton(id);
            expect(loadingManager.skeletonContainers.has(id)).toBe(false);
            expect(container.innerHTML).toBe('<p>Original content</p>');
        });
    });

    describe('Predefined Skeleton Layouts', () => {
        test('should provide predefined layouts', () => {
            const layouts = loadingManager.getSkeletonLayouts();
            
            expect(layouts).toHaveProperty('card');
            expect(layouts).toHaveProperty('list');
            expect(layouts).toHaveProperty('profile');
            expect(layouts).toHaveProperty('table');
            expect(layouts).toHaveProperty('dashboard');
            
            expect(Array.isArray(layouts.card)).toBe(true);
            expect(layouts.card.length).toBeGreaterThan(0);
        });
    });

    describe('Async Operation Wrapper', () => {
        test('should wrap successful async operation', async () => {
            const mockOperation = jest.fn(() => Promise.resolve('success'));
            
            const result = await loadingManager.wrapAsyncOperation(mockOperation, {
                globalLoading: true,
                loadingText: 'Processing...'
            });
            
            expect(result).toBe('success');
            expect(mockOperation).toHaveBeenCalled();
        });

        test('should handle async operation errors', async () => {
            const mockOperation = jest.fn(() => Promise.reject(new Error('Test error')));
            const mockErrorHandler = jest.fn();
            
            await loadingManager.wrapAsyncOperation(mockOperation, {
                onError: mockErrorHandler
            });
            
            expect(mockErrorHandler).toHaveBeenCalledWith(expect.any(Error));
        });

        test('should clean up loading states after operation', async () => {
            const element = document.createElement('div');
            const button = document.createElement('button');
            const form = document.createElement('form');
            
            const mockOperation = jest.fn(() => Promise.resolve('success'));
            
            await loadingManager.wrapAsyncOperation(mockOperation, {
                component: element,
                button: button,
                form: form
            });
            
            // Should have cleaned up loading states
            expect(element.classList.remove).toHaveBeenCalledWith('component-loading');
            expect(button.classList.remove).toHaveBeenCalledWith('btn-loading');
            expect(form.classList.remove).toHaveBeenCalledWith('form-loading');
        });
    });

    describe('Queue Management', () => {
        test('should manage loading queue', () => {
            const operationId = 'test-operation';
            
            loadingManager.addToQueue(operationId);
            expect(loadingManager.loadingQueue.has(operationId)).toBe(true);
            
            loadingManager.removeFromQueue(operationId);
            expect(loadingManager.loadingQueue.has(operationId)).toBe(false);
        });

        test('should update global loading state based on queue', () => {
            const mockIndicator = document.createElement('div');
            document.getElementById = jest.fn(() => mockIndicator);
            
            loadingManager.addToQueue('operation1');
            loadingManager.updateGlobalLoadingState();
            expect(mockIndicator.style.display).toBe('block');
            
            loadingManager.removeFromQueue('operation1');
            loadingManager.updateGlobalLoadingState();
            expect(mockIndicator.style.display).toBe('none');
        });
    });

    describe('Utility Methods', () => {
        test('should generate unique IDs', () => {
            const id1 = loadingManager.generateId();
            const id2 = loadingManager.generateId();
            
            expect(typeof id1).toBe('string');
            expect(typeof id2).toBe('string');
            expect(id1).not.toBe(id2);
        });
    });

    describe('Cleanup', () => {
        test('should clean up resources on destroy', () => {
            const element = document.createElement('div');
            loadingManager.setComponentLoading(element, true);
            
            const { id } = loadingManager.createProgressBar();
            
            loadingManager.destroy();
            
            expect(loadingManager.loadingStates.size).toBe(0);
            expect(loadingManager.progressBars.size).toBe(0);
            expect(loadingManager.skeletonContainers.size).toBe(0);
            expect(loadingManager.loadingQueue.size).toBe(0);
            expect(LoadingManager.instance).toBe(null);
        });
    });
});

// Integration tests for browser environment
if (typeof window !== 'undefined') {
    describe('LoadingManager Browser Integration', () => {
        let loadingManager;

        beforeEach(() => {
            loadingManager = new LoadingManager();
        });

        test('should inject styles into document', () => {
            const styleElement = document.getElementById('loading-manager-styles');
            expect(styleElement).toBeTruthy();
            expect(styleElement.tagName).toBe('STYLE');
        });

        test('should create overlay in document body', () => {
            const overlay = document.getElementById('global-loading-overlay');
            expect(overlay).toBeTruthy();
            expect(overlay.classList.contains('loading-overlay')).toBe(true);
        });

        test('should handle real DOM elements', () => {
            const button = document.createElement('button');
            button.textContent = 'Test Button';
            document.body.appendChild(button);

            loadingManager.setButtonLoading(button, true);
            expect(button.classList.contains('btn-loading')).toBe(true);
            expect(button.disabled).toBe(true);

            loadingManager.setButtonLoading(button, false);
            expect(button.classList.contains('btn-loading')).toBe(false);
            expect(button.disabled).toBe(false);

            document.body.removeChild(button);
        });
    });

    // Manual testing functions for browser console
    window.testLoadingManager = {
        showGlobalLoading: () => {
            loadingManager.showGlobalLoading('Testing global loading...');
            setTimeout(() => loadingManager.hideGlobalLoading(), 3000);
        },

        testProgressBar: () => {
            const container = document.createElement('div');
            container.style.cssText = 'margin: 20px; padding: 20px; border: 1px solid #ccc;';
            
            const { element, id } = loadingManager.createProgressBar({
                animated: true,
                initialValue: 0
            });
            
            container.appendChild(element);
            document.body.appendChild(container);
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                loadingManager.updateProgressBar(id, progress);
                
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        document.body.removeChild(container);
                        loadingManager.removeProgressBar(id);
                    }, 1000);
                }
            }, 200);
        },

        testSkeleton: () => {
            const container = document.createElement('div');
            container.style.cssText = 'margin: 20px; padding: 20px; border: 1px solid #ccc; width: 300px;';
            container.innerHTML = `
                <h3>Original Content</h3>
                <p>This is the original content that will be replaced with skeleton.</p>
                <button>Action Button</button>
            `;
            
            document.body.appendChild(container);
            
            const skeletonId = loadingManager.showSkeleton(container, [
                { type: 'title' },
                { type: 'text', lines: 2 },
                { type: 'button' }
            ]);
            
            setTimeout(() => {
                loadingManager.hideSkeleton(skeletonId);
                setTimeout(() => document.body.removeChild(container), 2000);
            }, 3000);
        },

        testAsyncWrapper: async () => {
            const button = document.createElement('button');
            button.textContent = 'Test Async Operation';
            button.style.cssText = 'margin: 20px; padding: 10px;';
            document.body.appendChild(button);
            
            const mockAsyncOperation = () => {
                return new Promise(resolve => {
                    setTimeout(() => resolve('Operation completed!'), 2000);
                });
            };
            
            button.addEventListener('click', async () => {
                try {
                    const result = await loadingManager.wrapAsyncOperation(mockAsyncOperation, {
                        button: button,
                        globalLoading: true,
                        loadingText: 'Processing async operation...'
                    });
                    
                    alert(result);
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            });
        }
    };

    console.log('LoadingManager test functions available:', Object.keys(window.testLoadingManager));
    console.log('Try: testLoadingManager.showGlobalLoading()');
}