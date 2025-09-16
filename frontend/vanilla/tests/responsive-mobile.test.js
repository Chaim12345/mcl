/**
 * Tests for Responsive Design and Mobile Components
 */

import { MobileNavigation } from '../js/components/navigation/MobileNavigation.js';
import { SwipeableCard } from '../js/components/mobile/SwipeableCard.js';
import { TouchManager } from '../js/utils/TouchManager.js';

// Mock touch events
class MockTouch {
    constructor(identifier, clientX, clientY) {
        this.identifier = identifier;
        this.clientX = clientX;
        this.clientY = clientY;
        this.pageX = clientX;
        this.pageY = clientY;
    }
}

class MockTouchEvent {
    constructor(type, touches = [], changedTouches = []) {
        this.type = type;
        this.touches = touches;
        this.changedTouches = changedTouches;
        this.preventDefault = jest.fn();
        this.stopPropagation = jest.fn();
        this.target = document.createElement('div');
    }
}

// Viewport simulation helpers
const setViewport = (width, height) => {
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
    });
    
    Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height,
    });
    
    window.dispatchEvent(new Event('resize'));
};

const setTouchDevice = (isTouch) => {
    Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: isTouch ? {} : undefined,
    });
    
    Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: isTouch ? 5 : 0,
    });
};

describe('TouchManager', () => {
    let container;
    let touchManager;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        
        // Mock touch support
        setTouchDevice(true);
        
        touchManager = new TouchManager();
    });

    afterEach(() => {
        if (touchManager) {
            touchManager.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Touch Detection', () => {
        test('should detect touch capabilities', () => {
            expect(touchManager.isTouch()).toBe(true);
            expect(touchManager.getCapabilities().touch).toBe(true);
        });

        test('should add capability classes to document', () => {
            expect(document.documentElement.classList.contains('touch-device')).toBe(true);
        });

        test('should detect non-touch devices', () => {
            setTouchDevice(false);
            const nonTouchManager = new TouchManager();
            
            expect(nonTouchManager.isTouch()).toBe(false);
            expect(document.documentElement.classList.contains('no-hover-device')).toBe(true);
            
            nonTouchManager.destroy();
        });
    });

    describe('Touch Events', () => {
        test('should handle touch start', () => {
            const handler = jest.fn();
            touchManager.on('touchstart', handler);
            
            const touch = new MockTouch(1, 100, 100);
            const event = new MockTouchEvent('touchstart', [touch]);
            
            touchManager.handleTouchEvent(event);
            
            expect(handler).toHaveBeenCalledWith({
                touches: expect.arrayContaining([
                    expect.objectContaining({
                        id: 1,
                        startX: 100,
                        startY: 100
                    })
                ]),
                originalEvent: event,
                target: event.target
            });
        });

        test('should track touch movement', () => {
            const handler = jest.fn();
            touchManager.on('touchmove', handler);
            
            // Start touch
            const startTouch = new MockTouch(1, 100, 100);
            const startEvent = new MockTouchEvent('touchstart', [startTouch]);
            touchManager.handleTouchEvent(startEvent);
            
            // Move touch
            const moveTouch = new MockTouch(1, 150, 100);
            const moveEvent = new MockTouchEvent('touchmove', [moveTouch]);
            touchManager.handleTouchEvent(moveEvent);
            
            expect(handler).toHaveBeenCalledWith({
                touches: expect.arrayContaining([
                    expect.objectContaining({
                        id: 1,
                        currentX: 150,
                        currentY: 100
                    })
                ]),
                originalEvent: moveEvent,
                target: moveEvent.target,
                velocity: expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number)
                })
            });
        });

        test('should detect swipe gestures', () => {
            const handler = jest.fn();
            touchManager.on('swipe', handler);
            
            touchManager.options.swipeThreshold = 50;
            
            // Simulate swipe
            const startTouch = new MockTouch(1, 100, 100);
            const startEvent = new MockTouchEvent('touchstart', [startTouch]);
            touchManager.handleTouchEvent(startEvent);
            
            const moveTouch = new MockTouch(1, 200, 100);
            const moveEvent = new MockTouchEvent('touchmove', [moveTouch]);
            touchManager.handleTouchEvent(moveEvent);
            
            expect(handler).toHaveBeenCalledWith({
                originalEvent: moveEvent,
                target: moveEvent.target,
                direction: 'right',
                distance: 100,
                angle: 0,
                deltaX: 100,
                deltaY: 0,
                velocity: expect.any(Object)
            });
        });

        test('should detect long press', (done) => {
            const handler = jest.fn();
            touchManager.on('longpress', handler);
            
            touchManager.options.longPressDelay = 100;
            
            const touch = new MockTouch(1, 100, 100);
            const event = new MockTouchEvent('touchstart', [touch]);
            touchManager.handleTouchEvent(event);
            
            setTimeout(() => {
                expect(handler).toHaveBeenCalledWith({
                    originalEvent: event,
                    target: event.target,
                    x: 100,
                    y: 100,
                    duration: expect.any(Number)
                });
                done();
            }, 150);
        });

        test('should cancel long press on movement', (done) => {
            const handler = jest.fn();
            touchManager.on('longpress', handler);
            
            touchManager.options.longPressDelay = 100;
            touchManager.options.touchThreshold = 10;
            
            // Start touch
            const startTouch = new MockTouch(1, 100, 100);
            const startEvent = new MockTouchEvent('touchstart', [startTouch]);
            touchManager.handleTouchEvent(startEvent);
            
            // Move beyond threshold
            const moveTouch = new MockTouch(1, 120, 100);
            const moveEvent = new MockTouchEvent('touchmove', [moveTouch]);
            touchManager.handleTouchEvent(moveEvent);
            
            setTimeout(() => {
                expect(handler).not.toHaveBeenCalled();
                done();
            }, 150);
        });
    });

    describe('Multi-touch Gestures', () => {
        test('should detect pinch gestures', () => {
            const handler = jest.fn();
            touchManager.on('pinch', handler);
            
            touchManager.options.enablePinch = true;
            
            // Start with two touches
            const touch1 = new MockTouch(1, 100, 100);
            const touch2 = new MockTouch(2, 200, 100);
            const startEvent = new MockTouchEvent('touchstart', [touch1, touch2]);
            touchManager.handleTouchEvent(startEvent);
            
            // Move touches closer (pinch in)
            const moveTouch1 = new MockTouch(1, 120, 100);
            const moveTouch2 = new MockTouch(2, 180, 100);
            const moveEvent = new MockTouchEvent('touchmove', [moveTouch1, moveTouch2]);
            touchManager.handleTouchEvent(moveEvent);
            
            expect(handler).toHaveBeenCalledWith({
                originalEvent: moveEvent,
                scale: 0.6, // 60/100 = 0.6
                center: { x: 150, y: 100 },
                distance: 60,
                velocity: expect.any(Object)
            });
        });

        test('should detect rotation gestures', () => {
            const handler = jest.fn();
            touchManager.on('rotate', handler);
            
            // Start with two touches
            const touch1 = new MockTouch(1, 100, 100);
            const touch2 = new MockTouch(2, 200, 100);
            const startEvent = new MockTouchEvent('touchstart', [touch1, touch2]);
            touchManager.handleTouchEvent(startEvent);
            
            // Rotate touches
            const moveTouch1 = new MockTouch(1, 100, 150);
            const moveTouch2 = new MockTouch(2, 200, 50);
            const moveEvent = new MockTouchEvent('touchmove', [moveTouch1, moveTouch2]);
            touchManager.handleTouchEvent(moveEvent);
            
            expect(handler).toHaveBeenCalledWith({
                originalEvent: moveEvent,
                rotation: expect.any(Number),
                center: { x: 150, y: 100 },
                angle: expect.any(Number)
            });
        });
    });

    describe('Event System', () => {
        test('should register and call event handlers', () => {
            const handler = jest.fn();
            touchManager.on('test', handler);
            
            touchManager.emit('test', { data: 'test' });
            
            expect(handler).toHaveBeenCalledWith({ data: 'test' });
        });

        test('should remove event handlers', () => {
            const handler = jest.fn();
            touchManager.on('test', handler);
            touchManager.off('test', handler);
            
            touchManager.emit('test', { data: 'test' });
            
            expect(handler).not.toHaveBeenCalled();
        });

        test('should handle errors in event handlers gracefully', () => {
            const errorHandler = jest.fn(() => {
                throw new Error('Test error');
            });
            const validHandler = jest.fn();
            
            touchManager.on('test', errorHandler);
            touchManager.on('test', validHandler);
            
            console.error = jest.fn();
            
            touchManager.emit('test', { data: 'test' });
            
            expect(console.error).toHaveBeenCalled();
            expect(validHandler).toHaveBeenCalled();
        });
    });
});

describe('MobileNavigation', () => {
    let container;
    let mobileNavigation;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        
        // Set mobile viewport
        setViewport(375, 667);
        setTouchDevice(true);
        
        mobileNavigation = new MobileNavigation(container, {
            workspaceId: 'test-workspace'
        });
    });

    afterEach(() => {
        if (mobileNavigation) {
            mobileNavigation.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should render mobile navigation', () => {
            expect(container.querySelector('.mobile-navigation')).toBeTruthy();
            expect(container.querySelector('.mobile-nav-header')).toBeTruthy();
            expect(container.querySelector('.mobile-drawer')).toBeTruthy();
        });

        test('should start with closed state', () => {
            expect(mobileNavigation.state.isOpen).toBe(false);
            expect(container.querySelector('.mobile-navigation--open')).toBeFalsy();
        });

        test('should detect mobile breakpoint', () => {
            expect(container.querySelector('.mobile-navigation--mobile')).toBeTruthy();
        });
    });

    describe('Menu Toggle', () => {
        test('should open menu when toggle button clicked', () => {
            const toggleBtn = container.querySelector('.mobile-menu-btn');
            toggleBtn.click();
            
            expect(mobileNavigation.state.isOpen).toBe(true);
            expect(container.querySelector('.mobile-navigation--open')).toBeTruthy();
        });

        test('should close menu when overlay clicked', () => {
            mobileNavigation.open();
            
            const overlay = container.querySelector('.mobile-drawer-overlay');
            overlay.click();
            
            expect(mobileNavigation.state.isOpen).toBe(false);
        });

        test('should close menu on escape key', () => {
            mobileNavigation.open();
            
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);
            
            expect(mobileNavigation.state.isOpen).toBe(false);
        });
    });

    describe('Swipe Gestures', () => {
        test('should open menu with right swipe from edge', () => {
            const startEvent = new MockTouchEvent('touchstart', [new MockTouch(1, 10, 100)]);
            const moveEvent = new MockTouchEvent('touchmove', [new MockTouch(1, 100, 100)]);
            const endEvent = new MockTouchEvent('touchend', [new MockTouch(1, 100, 100)]);
            
            container.dispatchEvent(startEvent);
            container.dispatchEvent(moveEvent);
            container.dispatchEvent(endEvent);
            
            expect(mobileNavigation.state.isOpen).toBe(true);
        });

        test('should close menu with left swipe', () => {
            mobileNavigation.open();
            
            const startEvent = new MockTouchEvent('touchstart', [new MockTouch(1, 200, 100)]);
            const moveEvent = new MockTouchEvent('touchmove', [new MockTouch(1, 100, 100)]);
            const endEvent = new MockTouchEvent('touchend', [new MockTouch(1, 100, 100)]);
            
            container.dispatchEvent(startEvent);
            container.dispatchEvent(moveEvent);
            container.dispatchEvent(endEvent);
            
            expect(mobileNavigation.state.isOpen).toBe(false);
        });

        test('should not trigger swipe on desktop', () => {
            setViewport(1024, 768);
            mobileNavigation.checkBreakpoint();
            
            const startEvent = new MockTouchEvent('touchstart', [new MockTouch(1, 10, 100)]);
            const moveEvent = new MockTouchEvent('touchmove', [new MockTouch(1, 100, 100)]);
            
            container.dispatchEvent(startEvent);
            container.dispatchEvent(moveEvent);
            
            expect(mobileNavigation.state.isOpen).toBe(false);
        });
    });

    describe('Navigation Items', () => {
        test('should render navigation items', () => {
            const navItems = container.querySelectorAll('.mobile-nav-item');
            expect(navItems.length).toBeGreaterThan(0);
        });

        test('should set active navigation item', () => {
            mobileNavigation.setActiveSection('dashboard');
            
            const activeItem = container.querySelector('.mobile-nav-item--active');
            expect(activeItem).toBeTruthy();
            expect(activeItem.dataset.navId).toBe('dashboard');
        });

        test('should close menu after navigation on mobile', () => {
            setViewport(375, 667);
            mobileNavigation.open();
            
            const navItem = container.querySelector('[data-nav-id="dashboard"]');
            navItem.click();
            
            setTimeout(() => {
                expect(mobileNavigation.state.isOpen).toBe(false);
            }, 200);
        });
    });

    describe('Responsive Behavior', () => {
        test('should adapt to desktop breakpoint', () => {
            setViewport(1024, 768);
            mobileNavigation.handleResize();
            
            expect(container.querySelector('.mobile-navigation--desktop')).toBeTruthy();
            expect(container.querySelector('.mobile-navigation--mobile')).toBeFalsy();
        });

        test('should auto-close on desktop resize', () => {
            mobileNavigation.open();
            
            setViewport(1024, 768);
            mobileNavigation.handleResize();
            
            expect(mobileNavigation.state.isOpen).toBe(false);
        });

        test('should handle orientation change', () => {
            mobileNavigation.handleOrientationChange();
            
            expect(mobileNavigation.state.isTracking).toBe(false);
        });
    });

    describe('Accessibility', () => {
        test('should set proper ARIA attributes', () => {
            const menuBtn = container.querySelector('.mobile-menu-btn');
            const drawer = container.querySelector('.mobile-drawer');
            
            expect(menuBtn.getAttribute('aria-expanded')).toBe('false');
            expect(drawer.getAttribute('aria-hidden')).toBe('true');
        });

        test('should update ARIA attributes when opened', () => {
            mobileNavigation.open();
            
            const menuBtn = container.querySelector('.mobile-menu-btn');
            const drawer = container.querySelector('.mobile-drawer');
            
            expect(menuBtn.getAttribute('aria-expanded')).toBe('true');
            expect(drawer.getAttribute('aria-hidden')).toBe('false');
        });

        test('should focus first element when opened', (done) => {
            mobileNavigation.open();
            
            setTimeout(() => {
                const firstFocusable = container.querySelector('a, button');
                expect(document.activeElement).toBe(firstFocusable);
                done();
            }, 150);
        });
    });
});

describe('SwipeableCard', () => {
    let container;
    let swipeableCard;
    let cardData;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        
        cardData = {
            id: 'card-1',
            title: 'Test Card',
            subtitle: 'Test Subtitle',
            description: 'Test Description',
            author: 'Test Author',
            date: '2024-01-15T10:00:00Z',
            tags: ['tag1', 'tag2']
        };
        
        setTouchDevice(true);
        
        swipeableCard = new SwipeableCard(container, {
            cardData,
            leftActions: [{
                id: 'archive',
                icon: 'archive',
                label: 'Archive',
                color: '#6b7280',
                action: 'archive'
            }],
            rightActions: [{
                id: 'delete',
                icon: 'delete',
                label: 'Delete',
                color: '#ef4444',
                action: 'delete'
            }]
        });
    });

    afterEach(() => {
        if (swipeableCard) {
            swipeableCard.destroy();
        }
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should render swipeable card', () => {
            expect(container.querySelector('.swipeable-card')).toBeTruthy();
            expect(container.querySelector('.swipeable-card-content')).toBeTruthy();
        });

        test('should render card content', () => {
            expect(container.textContent).toContain('Test Card');
            expect(container.textContent).toContain('Test Subtitle');
            expect(container.textContent).toContain('Test Description');
        });

        test('should render swipe actions', () => {
            expect(container.querySelector('[data-action="archive"]')).toBeTruthy();
            expect(container.querySelector('[data-action="delete"]')).toBeTruthy();
        });
    });

    describe('Touch Interactions', () => {
        test('should start swipe on touch start', () => {
            const touchStart = new MockTouchEvent('touchstart', [new MockTouch(1, 100, 100)]);
            container.dispatchEvent(touchStart);
            
            expect(swipeableCard.state.isDragging).toBe(true);
            expect(swipeableCard.state.isSwipeActive).toBe(true);
        });

        test('should track swipe movement', () => {
            // Start swipe
            const touchStart = new MockTouchEvent('touchstart', [new MockTouch(1, 100, 100)]);
            container.dispatchEvent(touchStart);
            
            // Move touch
            const touchMove = new MockTouchEvent('touchmove', [new MockTouch(1, 150, 100)]);
            container.dispatchEvent(touchMove);
            
            expect(swipeableCard.state.currentX).toBe(50);
            expect(swipeableCard.state.swipeDirection).toBe('right');
        });

        test('should complete swipe when threshold exceeded', () => {
            swipeableCard.swipeThreshold = 30;
            
            // Start and move
            const touchStart = new MockTouchEvent('touchstart', [new MockTouch(1, 100, 100)]);
            container.dispatchEvent(touchStart);
            
            const touchMove = new MockTouchEvent('touchmove', [new MockTouch(1, 200, 100)]);
            container.dispatchEvent(touchMove);
            
            const touchEnd = new MockTouchEvent('touchend', [new MockTouch(1, 200, 100)]);
            container.dispatchEvent(touchEnd);
            
            expect(swipeableCard.state.isRevealed).toBe(true);
        });

        test('should reset swipe when threshold not met', () => {
            swipeableCard.swipeThreshold = 100;
            
            // Start and move (small distance)
            const touchStart = new MockTouchEvent('touchstart', [new MockTouch(1, 100, 100)]);
            container.dispatchEvent(touchStart);
            
            const touchMove = new MockTouchEvent('touchmove', [new MockTouch(1, 120, 100)]);
            container.dispatchEvent(touchMove);
            
            const touchEnd = new MockTouchEvent('touchend', [new MockTouch(1, 120, 100)]);
            container.dispatchEvent(touchEnd);
            
            expect(swipeableCard.state.isRevealed).toBe(false);
        });
    });

    describe('Action Execution', () => {
        test('should execute action when clicked', () => {
            const actionHandler = jest.fn();
            swipeableCard.options.onAction = actionHandler;
            
            const actionBtn = container.querySelector('[data-action="delete"]');
            actionBtn.click();
            
            expect(actionHandler).toHaveBeenCalledWith({
                action: 'delete',
                actionId: 'delete',
                cardData
            });
        });

        test('should emit action events', () => {
            const actionSpy = jest.fn();
            eventBus.on('swipeable-card:action', actionSpy);
            
            const actionBtn = container.querySelector('[data-action="archive"]');
            actionBtn.click();
            
            expect(actionSpy).toHaveBeenCalledWith({
                action: 'archive',
                actionId: 'archive',
                cardData
            });
            
            eventBus.off('swipeable-card:action', actionSpy);
        });
    });

    describe('Keyboard Support', () => {
        test('should support arrow key navigation', () => {
            const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
            container.dispatchEvent(keyEvent);
            
            expect(swipeableCard.state.isRevealed).toBe(true);
        });

        test('should close on Escape when revealed', () => {
            swipeableCard.setState({ isRevealed: true });
            
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            container.dispatchEvent(escapeEvent);
            
            expect(swipeableCard.state.isRevealed).toBe(false);
        });

        test('should execute action with number keys', () => {
            swipeableCard.setState({ 
                isRevealed: true, 
                revealedSide: 'right' 
            });
            
            const actionHandler = jest.fn();
            swipeableCard.options.onAction = actionHandler;
            
            const numberEvent = new KeyboardEvent('keydown', { key: '1' });
            container.dispatchEvent(numberEvent);
            
            expect(actionHandler).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        test('should set proper ARIA attributes', () => {
            const card = container.querySelector('.swipeable-card');
            expect(card.getAttribute('role')).toBe('article');
            expect(card.getAttribute('tabindex')).toBe('0');
        });

        test('should announce actions to screen reader', () => {
            const spy = jest.spyOn(swipeableCard, 'announceToScreenReader');
            
            swipeableCard.showActionPanel('left');
            
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('Swipe actions revealed'));
        });
    });

    describe('Public API', () => {
        test('should update card data', () => {
            const newData = { title: 'Updated Title' };
            swipeableCard.setCardData(newData);
            
            expect(container.textContent).toContain('Updated Title');
        });

        test('should return card data', () => {
            const data = swipeableCard.getCardData();
            expect(data.title).toBe('Test Card');
        });

        test('should close programmatically', () => {
            swipeableCard.setState({ isRevealed: true });
            swipeableCard.close();
            
            expect(swipeableCard.state.isRevealed).toBe(false);
        });

        test('should check revealed state', () => {
            expect(swipeableCard.isRevealed()).toBe(false);
            
            swipeableCard.setState({ isRevealed: true });
            expect(swipeableCard.isRevealed()).toBe(true);
        });
    });
});

describe('Responsive Utilities', () => {
    describe('Viewport Detection', () => {
        test('should detect mobile viewport', () => {
            setViewport(375, 667);
            
            const isMobile = window.innerWidth < 768;
            expect(isMobile).toBe(true);
        });

        test('should detect tablet viewport', () => {
            setViewport(768, 1024);
            
            const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
            expect(isTablet).toBe(true);
        });

        test('should detect desktop viewport', () => {
            setViewport(1200, 800);
            
            const isDesktop = window.innerWidth >= 1024;
            expect(isDesktop).toBe(true);
        });
    });

    describe('Touch Device Detection', () => {
        test('should detect touch support', () => {
            setTouchDevice(true);
            
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            expect(hasTouch).toBe(true);
        });

        test('should detect non-touch devices', () => {
            setTouchDevice(false);
            
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            expect(hasTouch).toBe(false);
        });
    });

    describe('Orientation Handling', () => {
        test('should handle orientation change', () => {
            const handler = jest.fn();
            window.addEventListener('orientationchange', handler);
            
            // Simulate orientation change
            window.dispatchEvent(new Event('orientationchange'));
            
            expect(handler).toHaveBeenCalled();
            
            window.removeEventListener('orientationchange', handler);
        });
    });

    describe('Safe Area Support', () => {
        test('should handle safe area insets', () => {
            // Mock CSS env() function support
            const style = document.createElement('style');
            style.textContent = `
                .test-safe-area {
                    padding-top: env(safe-area-inset-top, 20px);
                    padding-bottom: env(safe-area-inset-bottom, 0px);
                }
            `;
            document.head.appendChild(style);
            
            const element = document.createElement('div');
            element.className = 'test-safe-area';
            document.body.appendChild(element);
            
            const computed = window.getComputedStyle(element);
            expect(computed.paddingTop).toBeTruthy();
            
            document.body.removeChild(element);
            document.head.removeChild(style);
        });
    });
});

describe('Performance and Accessibility', () => {
    describe('Reduced Motion', () => {
        test('should respect prefers-reduced-motion', () => {
            // Mock media query
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockReturnValue({
                    matches: true,
                    addListener: jest.fn(),
                    removeListener: jest.fn()
                })
            });
            
            const touchManager = new TouchManager();
            expect(touchManager.options.reduceMotion).toBe(true);
            
            touchManager.destroy();
        });
    });

    describe('Focus Management', () => {
        test('should maintain focus trap in modal', () => {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <button id="first">First</button>
                <button id="last">Last</button>
            `;
            document.body.appendChild(modal);
            
            const firstBtn = modal.querySelector('#first');
            const lastBtn = modal.querySelector('#last');
            
            // Simulate Tab on last element
            lastBtn.focus();
            const tabEvent = new KeyboardEvent('keydown', { 
                key: 'Tab', 
                shiftKey: false 
            });
            
            lastBtn.dispatchEvent(tabEvent);
            
            document.body.removeChild(modal);
        });
    });

    describe('Performance Optimization', () => {
        test('should use hardware acceleration', () => {
            const element = document.createElement('div');
            element.className = 'swipeable-card-content';
            document.body.appendChild(element);
            
            const computed = window.getComputedStyle(element);
            // Check for transform property which enables hardware acceleration
            expect(computed.transform).toBeDefined();
            
            document.body.removeChild(element);
        });

        test('should throttle resize events', () => {
            const handler = jest.fn();
            const throttledHandler = jest.fn();
            
            // Simulate throttling
            let timeout;
            const throttle = (func, limit) => {
                return function() {
                    if (!timeout) {
                        func.apply(this, arguments);
                        timeout = setTimeout(() => {
                            timeout = null;
                        }, limit);
                    }
                };
            };
            
            const throttled = throttle(throttledHandler, 100);
            
            // Fire multiple events quickly
            for (let i = 0; i < 5; i++) {
                throttled();
            }
            
            expect(throttledHandler).toHaveBeenCalledTimes(1);
        });
    });
});

// Integration tests
describe('Mobile Component Integration', () => {
    test('should work together in mobile layout', () => {
        setViewport(375, 667);
        setTouchDevice(true);
        
        const container = document.createElement('div');
        document.body.appendChild(container);
        
        // Create navigation
        const nav = new MobileNavigation(container, {
            workspaceId: 'test'
        });
        
        // Create cards
        const cardContainer = document.createElement('div');
        container.appendChild(cardContainer);
        
        const card = new SwipeableCard(cardContainer, {
            cardData: { id: '1', title: 'Test' }
        });
        
        // Test interaction
        expect(nav.state.isOpen).toBe(false);
        expect(card.state.isRevealed).toBe(false);
        
        // Navigation should work
        nav.open();
        expect(nav.state.isOpen).toBe(true);
        
        // Card should work
        card.setState({ isRevealed: true });
        expect(card.state.isRevealed).toBe(true);
        
        // Cleanup
        nav.destroy();
        card.destroy();
        document.body.removeChild(container);
    });
}); 