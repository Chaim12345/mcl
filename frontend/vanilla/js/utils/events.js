/**
 * Event System for Component Communication
 */

/**
 * Global Event Bus
 */
class EventBus {
    constructor() {
        this.events = new Map();
    }
    
    /**
     * Subscribe to an event
     */
    on(eventName, callback, context = null) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        
        const listener = { callback, context };
        this.events.get(eventName).push(listener);
        
        // Return unsubscribe function
        return () => this.off(eventName, callback, context);
    }
    
    /**
     * Subscribe to an event once
     */
    once(eventName, callback, context = null) {
        const onceCallback = (...args) => {
            callback.apply(context, args);
            this.off(eventName, onceCallback, context);
        };
        
        return this.on(eventName, onceCallback, context);
    }
    
    /**
     * Unsubscribe from an event
     */
    off(eventName, callback = null, context = null) {
        if (!this.events.has(eventName)) return;
        
        const listeners = this.events.get(eventName);
        
        if (!callback) {
            // Remove all listeners for this event
            this.events.delete(eventName);
            return;
        }
        
        // Remove specific listener
        const index = listeners.findIndex(listener => 
            listener.callback === callback && listener.context === context
        );
        
        if (index !== -1) {
            listeners.splice(index, 1);
            
            // Clean up empty event arrays
            if (listeners.length === 0) {
                this.events.delete(eventName);
            }
        }
    }
    
    /**
     * Emit an event
     */
    emit(eventName, ...args) {
        if (!this.events.has(eventName)) return;
        
        const listeners = [...this.events.get(eventName)]; // Copy to avoid issues with modifications during iteration
        
        listeners.forEach(({ callback, context }) => {
            try {
                callback.apply(context, args);
            } catch (error) {
                console.error(`Error in event listener for "${eventName}":`, error);
            }
        });
    }
    
    /**
     * Get all event names
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }
    
    /**
     * Get listener count for an event
     */
    getListenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }
    
    /**
     * Clear all events
     */
    clear() {
        this.events.clear();
    }
}

// Global event bus instance
export const eventBus = new EventBus();

/**
 * Custom Event Creator
 */
export function createCustomEvent(name, detail = {}, options = {}) {
    const defaultOptions = {
        bubbles: true,
        cancelable: true,
        composed: false
    };
    
    return new CustomEvent(name, {
        detail,
        ...defaultOptions,
        ...options
    });
}

/**
 * Event Delegation Helper
 */
export class EventDelegate {
    constructor(container) {
        this.container = container;
        this.delegates = new Map();
    }
    
    /**
     * Add delegated event listener
     */
    on(selector, eventType, handler) {
        const key = `${selector}:${eventType}`;
        
        if (!this.delegates.has(key)) {
            const delegateHandler = (event) => {
                const target = event.target.closest(selector);
                if (target && this.container.contains(target)) {
                    handler.call(target, event);
                }
            };
            
            this.container.addEventListener(eventType, delegateHandler);
            this.delegates.set(key, delegateHandler);
        }
        
        return this;
    }
    
    /**
     * Remove delegated event listener
     */
    off(selector, eventType) {
        const key = `${selector}:${eventType}`;
        
        if (this.delegates.has(key)) {
            const handler = this.delegates.get(key);
            this.container.removeEventListener(eventType, handler);
            this.delegates.delete(key);
        }
        
        return this;
    }
    
    /**
     * Remove all delegated event listeners
     */
    clear() {
        this.delegates.forEach((handler, key) => {
            const [, eventType] = key.split(':');
            this.container.removeEventListener(eventType, handler);
        });
        this.delegates.clear();
        
        return this;
    }
}

/**
 * Debounce utility for events
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle utility for events
 */
export function throttle(func, limit) {
    let inThrottle;
    
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Event listener with automatic cleanup
 */
export class EventManager {
    constructor() {
        this.listeners = [];
    }
    
    /**
     * Add event listener
     */
    add(element, event, handler, options = {}) {
        const boundHandler = handler.bind(this);
        element.addEventListener(event, boundHandler, options);
        
        this.listeners.push({
            element,
            event,
            handler: boundHandler,
            originalHandler: handler
        });
        
        return this;
    }
    
    /**
     * Remove specific event listener
     */
    remove(element, event, originalHandler) {
        const index = this.listeners.findIndex(listener => 
            listener.element === element && 
            listener.event === event && 
            listener.originalHandler === originalHandler
        );
        
        if (index !== -1) {
            const listener = this.listeners[index];
            listener.element.removeEventListener(listener.event, listener.handler);
            this.listeners.splice(index, 1);
        }
        
        return this;
    }
    
    /**
     * Remove all event listeners
     */
    removeAll() {
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.listeners = [];
        
        return this;
    }
    
    /**
     * Get listener count
     */
    getCount() {
        return this.listeners.length;
    }
}

/**
 * Keyboard event utilities
 */
export const keyboard = {
    keys: {
        ENTER: 'Enter',
        ESCAPE: 'Escape',
        SPACE: ' ',
        TAB: 'Tab',
        ARROW_UP: 'ArrowUp',
        ARROW_DOWN: 'ArrowDown',
        ARROW_LEFT: 'ArrowLeft',
        ARROW_RIGHT: 'ArrowRight',
        BACKSPACE: 'Backspace',
        DELETE: 'Delete'
    },
    
    /**
     * Check if key matches
     */
    isKey(event, key) {
        return event.key === key;
    },
    
    /**
     * Check for modifier keys
     */
    hasModifier(event, modifier) {
        switch (modifier) {
            case 'ctrl': return event.ctrlKey;
            case 'shift': return event.shiftKey;
            case 'alt': return event.altKey;
            case 'meta': return event.metaKey;
            default: return false;
        }
    },
    
    /**
     * Create keyboard shortcut handler
     */
    shortcut(keys, handler) {
        return (event) => {
            const keyCombo = keys.toLowerCase().split('+');
            const key = keyCombo.pop();
            
            // Check modifiers
            const hasCtrl = keyCombo.includes('ctrl') ? event.ctrlKey : !event.ctrlKey;
            const hasShift = keyCombo.includes('shift') ? event.shiftKey : !event.shiftKey;
            const hasAlt = keyCombo.includes('alt') ? event.altKey : !event.altKey;
            const hasMeta = keyCombo.includes('meta') ? event.metaKey : !event.metaKey;
            
            if (event.key.toLowerCase() === key && hasCtrl && hasShift && hasAlt && hasMeta) {
                event.preventDefault();
                handler(event);
            }
        };
    }
};

/**
 * Mouse event utilities
 */
export const mouse = {
    /**
     * Get mouse position relative to element
     */
    getRelativePosition(event, element) {
        const rect = element.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    },
    
    /**
     * Check if click is outside element
     */
    isOutside(event, element) {
        return !element.contains(event.target);
    },
    
    /**
     * Detect double click
     */
    doubleClick(element, handler, delay = 300) {
        let clickCount = 0;
        let clickTimer = null;
        
        element.addEventListener('click', (event) => {
            clickCount++;
            
            if (clickCount === 1) {
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, delay);
            } else if (clickCount === 2) {
                clearTimeout(clickTimer);
                clickCount = 0;
                handler(event);
            }
        });
    }
};

/**
 * Touch event utilities
 */
export const touch = {
    /**
     * Detect swipe gestures
     */
    swipe(element, handlers = {}) {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        const minSwipeDistance = 50;
        
        element.addEventListener('touchstart', (event) => {
            const touch = event.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
        });
        
        element.addEventListener('touchend', (event) => {
            const touch = event.changedTouches[0];
            endX = touch.clientX;
            endY = touch.clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX > 0 && handlers.right) {
                        handlers.right(event);
                    } else if (deltaX < 0 && handlers.left) {
                        handlers.left(event);
                    }
                }
            } else {
                // Vertical swipe
                if (Math.abs(deltaY) > minSwipeDistance) {
                    if (deltaY > 0 && handlers.down) {
                        handlers.down(event);
                    } else if (deltaY < 0 && handlers.up) {
                        handlers.up(event);
                    }
                }
            }
        });
    }
};