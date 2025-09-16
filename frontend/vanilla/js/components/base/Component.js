/**
 * Base Component class for vanilla JavaScript components
 * Provides lifecycle management, state handling, and DOM utilities
 */
export class Component {
    constructor(element, options = {}) {
        this.element = element;
        this.options = { ...this.defaultOptions, ...options };
        this.state = { ...this.initialState };
        this.eventListeners = new Map();
        this.childComponents = new Map();
        this.isMounted = false;
        
        // Bind methods to maintain context
        this.render = this.render.bind(this);
        this.mount = this.mount.bind(this);
        this.unmount = this.unmount.bind(this);
        this.setState = this.setState.bind(this);
        
        // Initialize component
        this.init();
    }
    
    /**
     * Default options for the component
     */
    get defaultOptions() {
        return {};
    }
    
    /**
     * Initial state for the component
     */
    get initialState() {
        return {};
    }
    
    /**
     * Initialize the component
     */
    init() {
        // Override in subclasses
    }
    
    /**
     * Mount the component to the DOM
     */
    mount() {
        if (this.isMounted) return;
        
        this.beforeMount();
        this.render();
        this.bindEvents();
        this.isMounted = true;
        this.afterMount();
        
        return this;
    }
    
    /**
     * Unmount the component from the DOM
     */
    unmount() {
        if (!this.isMounted) return;
        
        this.beforeUnmount();
        this.unbindEvents();
        this.unmountChildren();
        this.isMounted = false;
        this.afterUnmount();
        
        return this;
    }
    
    /**
     * Render the component
     */
    render() {
        const html = this.template();
        if (html) {
            this.element.innerHTML = html;
        }
        this.afterRender();
        return this;
    }
    
    /**
     * Template method - override in subclasses
     */
    template() {
        return '';
    }
    
    /**
     * Update component state and trigger re-render
     */
    setState(newState, shouldRender = true) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        this.onStateChange(prevState, this.state);
        
        if (shouldRender && this.isMounted) {
            this.render();
        }
        
        return this;
    }
    
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Override in subclasses
    }
    
    /**
     * Unbind event listeners
     */
    unbindEvents() {
        this.eventListeners.forEach((listener, element) => {
            const [event, handler] = listener;
            element.removeEventListener(event, handler);
        });
        this.eventListeners.clear();
    }
    
    /**
     * Add event listener with automatic cleanup
     */
    addEventListener(element, event, handler, options = {}) {
        const boundHandler = handler.bind(this);
        element.addEventListener(event, boundHandler, options);
        this.eventListeners.set(element, [event, boundHandler]);
        return this;
    }
    
    /**
     * Remove event listener
     */
    removeEventListener(element, event) {
        if (this.eventListeners.has(element)) {
            const [storedEvent, handler] = this.eventListeners.get(element);
            if (storedEvent === event) {
                element.removeEventListener(event, handler);
                this.eventListeners.delete(element);
            }
        }
        return this;
    }
    
    /**
     * Emit custom event
     */
    emit(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true
        });
        this.element.dispatchEvent(event);
        return this;
    }
    
    /**
     * Listen for custom events
     */
    on(eventName, handler) {
        this.addEventListener(this.element, eventName, handler);
        return this;
    }
    
    /**
     * Listen for custom events once
     */
    once(eventName, handler) {
        const onceHandler = (event) => {
            handler.call(this, event);
            this.removeEventListener(this.element, eventName);
        };
        this.addEventListener(this.element, eventName, onceHandler);
        return this;
    }
    
    /**
     * Add child component
     */
    addChild(name, component) {
        this.childComponents.set(name, component);
        return this;
    }
    
    /**
     * Get child component
     */
    getChild(name) {
        return this.childComponents.get(name);
    }
    
    /**
     * Remove child component
     */
    removeChild(name) {
        const child = this.childComponents.get(name);
        if (child) {
            child.unmount();
            this.childComponents.delete(name);
        }
        return this;
    }
    
    /**
     * Unmount all child components
     */
    unmountChildren() {
        this.childComponents.forEach(child => child.unmount());
        this.childComponents.clear();
    }
    
    /**
     * Find element within component
     */
    find(selector) {
        return this.element.querySelector(selector);
    }
    
    /**
     * Find all elements within component
     */
    findAll(selector) {
        return this.element.querySelectorAll(selector);
    }
    
    /**
     * Lifecycle hooks - override in subclasses
     */
    beforeMount() {}
    afterMount() {}
    beforeUnmount() {}
    afterUnmount() {}
    afterRender() {}
    onStateChange(prevState, newState) {}
    
    /**
     * Destroy the component
     */
    destroy() {
        this.unmount();
        this.element = null;
        this.options = null;
        this.state = null;
        this.eventListeners = null;
        this.childComponents = null;
    }
}