/**
 * Base class for all UI components
 * Provides consistent initialization, rendering, and cleanup
 */
class ComponentBase {
  /**
   * Initialize a new component
   * @param {HTMLElement} container - The DOM element to render into
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = { ...this.getDefaultOptions(), ...options };
    this.state = { ...this.getInitialState() };
    this.refs = {};
    
    // Auto-bind methods
    this.bindMethods();
    
    // Initialize component
    this.init();
  }
  
  /**
   * Get default options for the component
   * @returns {Object} Default options
   */
  getDefaultOptions() {
    return {
      autoInit: true,
      debug: false
    };
  }
  
  /**
   * Get initial state for the component
   * @returns {Object} Initial state
   */
  getInitialState() {
    return {
      initialized: false,
      loading: false,
      error: null
    };
  }
  
  /**
   * Bind class methods to the instance
   */
  bindMethods() {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    methods.forEach(method => {
      if (typeof this[method] === 'function' && method !== 'constructor') {
        this[method] = this[method].bind(this);
      }
    });
  }
  
  /**
   * Initialize the component
   */
  init() {
    try {
      this.render();
      this.setupEventListeners();
      this.setupSubscriptions();
      this.state.initialized = true;
      
      // Notify initialization complete
      this.onInitialized();
    } catch (error) {
      this.handleError(error, 'Initialization failed');
    }
  }
  
  /**
   * Render the component
   */
  render() {
    // Should be implemented by child classes
    throw new Error('render() must be implemented by child class');
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Should be implemented by child classes
  }
  
  /**
   * Setup event subscriptions
   */
  setupSubscriptions() {
    // Should be implemented by child classes
  }
  
  /**
   * Handle component initialization
   */
  onInitialized() {
    // Can be overridden by child classes
  }
  
  /**
   * Handle errors
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   */
  handleError(error, context) {
    console.error(`[${this.constructor.name}] ${context}:`, error);
    
    // Update state with error
    this.setState({ error: { message: error.message, context } });
    
    // Notify error handler
    this.onError(error, context);
  }
  
  /**
   * Handle error callback
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   */
  onError(error, context) {
    // Can be overridden by child classes
  }
  
  /**
   * Update component state
   * @param {Object} newState - New state to merge
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.onStateChanged();
  }
  
  /**
   * Handle state changes
   */
  onStateChanged() {
    // Can be overridden by child classes
  }
  
  /**
   * Cleanup the component
   */
  destroy() {
    // Remove event listeners
    this.teardownEventListeners();
    
    // Remove subscriptions
    this.teardownSubscriptions();
    
    // Clear container
    this.container.innerHTML = '';
    
    // Notify destruction
    this.onDestroyed();
  }
  
  /**
   * Teardown event listeners
   */
  teardownEventListeners() {
    // Should be implemented by child classes
  }
  
  /**
   * Teardown event subscriptions
   */
  teardownSubscriptions() {
    // Should be implemented by child classes
  }
  
  /**
   * Handle component destruction
   */
  onDestroyed() {
    // Can be overridden by child classes
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComponentBase;
}