/**
 * Simple State Management System
 */

import { eventBus } from './events.js';

/**
 * Reactive State Store
 */
export class Store {
    constructor(initialState = {}) {
        this.state = { ...initialState };
        this.subscribers = new Map();
        this.middleware = [];
        this.history = [];
        this.maxHistorySize = 50;
    }
    
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Set state and notify subscribers
     */
    setState(newState, action = 'SET_STATE') {
        const prevState = { ...this.state };
        
        // Apply middleware
        let processedState = newState;
        for (const middleware of this.middleware) {
            processedState = middleware(processedState, prevState, action);
        }
        
        // Update state
        this.state = { ...this.state, ...processedState };
        
        // Add to history
        this.addToHistory(prevState, this.state, action);
        
        // Notify subscribers
        this.notifySubscribers(prevState, this.state, action);
        
        // Emit global event
        eventBus.emit('state:change', {
            prevState,
            newState: this.state,
            action
        });
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(callback, selector = null) {
        const id = Date.now() + Math.random();
        this.subscribers.set(id, { callback, selector });
        
        // Return unsubscribe function
        return () => this.subscribers.delete(id);
    }
    
    /**
     * Notify all subscribers
     */
    notifySubscribers(prevState, newState, action) {
        this.subscribers.forEach(({ callback, selector }) => {
            try {
                if (selector) {
                    const prevSelected = selector(prevState);
                    const newSelected = selector(newState);
                    
                    // Only notify if selected state changed
                    if (JSON.stringify(prevSelected) !== JSON.stringify(newSelected)) {
                        callback(newSelected, prevSelected, action);
                    }
                } else {
                    callback(newState, prevState, action);
                }
            } catch (error) {
                console.error('Error in state subscriber:', error);
            }
        });
    }
    
    /**
     * Add middleware
     */
    use(middleware) {
        this.middleware.push(middleware);
        return this;
    }
    
    /**
     * Add to history
     */
    addToHistory(prevState, newState, action) {
        this.history.push({
            prevState,
            newState,
            action,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
    
    /**
     * Get state history
     */
    getHistory() {
        return [...this.history];
    }
    
    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
        return this;
    }
    
    /**
     * Reset state to initial
     */
    reset(initialState = {}) {
        this.setState(initialState, 'RESET');
        this.clearHistory();
        return this;
    }
}

/**
 * Create a computed property that updates when dependencies change
 */
export function computed(store, selector, dependencies = []) {
    let cachedValue = selector(store.getState());
    let isValid = true;
    
    // Subscribe to state changes
    const unsubscribe = store.subscribe((newState, prevState) => {
        // Check if any dependencies changed
        if (dependencies.length === 0) {
            // No specific dependencies, always recompute
            isValid = false;
        } else {
            // Check if any dependency changed
            for (const dep of dependencies) {
                if (JSON.stringify(dep(newState)) !== JSON.stringify(dep(prevState))) {
                    isValid = false;
                    break;
                }
            }
        }
    });
    
    return {
        get value() {
            if (!isValid) {
                cachedValue = selector(store.getState());
                isValid = true;
            }
            return cachedValue;
        },
        
        destroy() {
            unsubscribe();
        }
    };
}

/**
 * Local Storage Persistence Middleware
 */
export function persistenceMiddleware(key = 'app-state', storage = localStorage) {
    return (newState, prevState, action) => {
        // Save to storage after state update
        setTimeout(() => {
            try {
                storage.setItem(key, JSON.stringify(newState));
            } catch (error) {
                console.warn('Failed to persist state:', error);
            }
        }, 0);
        
        return newState;
    };
}

/**
 * Load persisted state
 */
export function loadPersistedState(key = 'app-state', storage = localStorage) {
    try {
        const saved = storage.getItem(key);
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.warn('Failed to load persisted state:', error);
        return {};
    }
}

/**
 * Logger Middleware
 */
export function loggerMiddleware(options = {}) {
    const { collapsed = true, colors = true } = options;
    
    return (newState, prevState, action) => {
        const timestamp = new Date().toLocaleTimeString();
        const style = colors ? 'color: #9E9E9E; font-weight: bold' : '';
        
        if (collapsed) {
            console.groupCollapsed(`%c${action} @ ${timestamp}`, style);
        } else {
            console.group(`%c${action} @ ${timestamp}`, style);
        }
        
        console.log('%cprev state', 'color: #9E9E9E; font-weight: bold', prevState);
        console.log('%caction', 'color: #03A9F4; font-weight: bold', action);
        console.log('%cnext state', 'color: #4CAF50; font-weight: bold', newState);
        console.groupEnd();
        
        return newState;
    };
}

/**
 * Validation Middleware
 */
export function validationMiddleware(schema) {
    return (newState, prevState, action) => {
        // Simple validation - can be extended with a proper schema validator
        for (const [key, validator] of Object.entries(schema)) {
            if (key in newState) {
                const isValid = typeof validator === 'function' 
                    ? validator(newState[key]) 
                    : typeof newState[key] === validator;
                
                if (!isValid) {
                    console.error(`Validation failed for ${key}:`, newState[key]);
                    // Optionally throw error or revert to previous value
                    newState[key] = prevState[key];
                }
            }
        }
        
        return newState;
    };
}

/**
 * Global Application Store
 */
export const appStore = new Store({
    user: null,
    workspace: null,
    boards: [],
    currentBoard: null,
    items: [],
    loading: false,
    error: null,
    theme: 'light',
    notifications: []
});

// Add persistence
appStore.use(persistenceMiddleware());

// Add logger in development
// if (process.env.NODE_ENV === 'development') {
//     // Development-only logic here
// }
appStore.use(loggerMiddleware());

// Load persisted state
const persistedState = loadPersistedState();
if (Object.keys(persistedState).length > 0) {
    appStore.setState(persistedState, 'LOAD_PERSISTED');
}

/**
 * Action creators for common operations
 */
export const actions = {
    setUser(user) {
        appStore.setState({ user }, 'SET_USER');
    },
    
    setWorkspace(workspace) {
        appStore.setState({ workspace }, 'SET_WORKSPACE');
    },
    
    setBoards(boards) {
        appStore.setState({ boards }, 'SET_BOARDS');
    },
    
    setCurrentBoard(board) {
        appStore.setState({ currentBoard: board }, 'SET_CURRENT_BOARD');
    },
    
    setItems(items) {
        appStore.setState({ items }, 'SET_ITEMS');
    },
    
    addItem(item) {
        const items = [...appStore.getState().items, item];
        appStore.setState({ items }, 'ADD_ITEM');
    },
    
    updateItem(itemId, updates) {
        const items = appStore.getState().items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
        );
        appStore.setState({ items }, 'UPDATE_ITEM');
    },
    
    removeItem(itemId) {
        const items = appStore.getState().items.filter(item => item.id !== itemId);
        appStore.setState({ items }, 'REMOVE_ITEM');
    },
    
    setLoading(loading) {
        appStore.setState({ loading }, 'SET_LOADING');
    },
    
    setError(error) {
        appStore.setState({ error }, 'SET_ERROR');
    },
    
    clearError() {
        appStore.setState({ error: null }, 'CLEAR_ERROR');
    },
    
    setTheme(theme) {
        appStore.setState({ theme }, 'SET_THEME');
        document.documentElement.setAttribute('data-theme', theme);
    },
    
    addNotification(notification) {
        const notifications = [...appStore.getState().notifications, {
            id: Date.now(),
            timestamp: Date.now(),
            ...notification
        }];
        appStore.setState({ notifications }, 'ADD_NOTIFICATION');
    },
    
    removeNotification(id) {
        const notifications = appStore.getState().notifications.filter(n => n.id !== id);
        appStore.setState({ notifications }, 'REMOVE_NOTIFICATION');
    },
    
    clearNotifications() {
        appStore.setState({ notifications: [] }, 'CLEAR_NOTIFICATIONS');
    }
};

/**
 * Selectors for common state access
 */
export const selectors = {
    getUser: (state) => state.user,
    getWorkspace: (state) => state.workspace,
    getBoards: (state) => state.boards,
    getCurrentBoard: (state) => state.currentBoard,
    getItems: (state) => state.items,
    getItemById: (id) => (state) => state.items.find(item => item.id === id),
    getItemsByBoard: (boardId) => (state) => state.items.filter(item => item.boardId === boardId),
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getTheme: (state) => state.theme,
    getNotifications: (state) => state.notifications,
    isAuthenticated: (state) => !!state.user
};

// Export appStore as state for backward compatibility
export const state = appStore;