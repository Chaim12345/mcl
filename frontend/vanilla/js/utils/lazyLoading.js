/**
 * Comprehensive lazy loading system for optimal performance
 * Includes virtual scrolling, image lazy loading, and progressive loading
 */

class VirtualScroller {
  constructor(container, options = {}) {
    this.container = container;
    this.items = [];
    this.renderedItems = new Set();
    this.itemHeight = options.itemHeight || 50;
    this.bufferSize = options.bufferSize || 5;
    this.onRenderItem = options.onRenderItem || (() => {});
    this.onRemoveItem = options.onRemoveItem || (() => {});
    
    this.scrollTop = 0;
    this.containerHeight = 0;
    this.totalHeight = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    
    this.init();
  }

  init() {
    this.createScrollContainer();
    this.attachEventListeners();
    this.updateContainerHeight();
  }

  createScrollContainer() {
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'virtual-scroll-container';
    this.scrollContainer.style.position = 'relative';
    this.scrollContainer.style.width = '100%';
    
    this.itemsContainer = document.createElement('div');
    this.itemsContainer.className = 'virtual-scroll-items';
    this.itemsContainer.style.position = 'absolute';
    this.itemsContainer.style.top = '0';
    this.itemsContainer.style.left = '0';
    this.itemsContainer.style.width = '100%';
    
    this.scrollContainer.appendChild(this.itemsContainer);
    this.container.appendChild(this.scrollContainer);
  }

  attachEventListeners() {
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  setItems(items) {
    this.items = items;
    this.updateContainerHeight();
    this.handleScroll();
  }

  updateContainerHeight() {
    this.totalHeight = this.items.length * this.itemHeight;
    this.scrollContainer.style.height = `${this.totalHeight}px`;
    this.containerHeight = this.container.clientHeight;
  }

  handleScroll() {
    this.scrollTop = this.container.scrollTop;
    
    const newStartIndex = Math.max(
      0,
      Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize
    );
    
    const newEndIndex = Math.min(
      this.items.length - 1,
      Math.floor((this.scrollTop + this.containerHeight) / this.itemHeight) + this.bufferSize
    );

    if (newStartIndex !== this.startIndex || newEndIndex !== this.endIndex) {
      this.renderRange(newStartIndex, newEndIndex);
    }
  }

  handleResize() {
    this.updateContainerHeight();
    this.handleScroll();
  }

  renderRange(startIndex, endIndex) {
    // Remove items outside the new range
    this.renderedItems.forEach(index => {
      if (index < startIndex || index > endIndex) {
        this.removeItem(index);
      }
    });

    // Add new items in range
    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= 0 && i < this.items.length && !this.renderedItems.has(i)) {
        this.renderItem(i);
      }
    }

    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }

  renderItem(index) {
    const item = this.items[index];
    const element = this.onRenderItem(item, index);
    
    if (element) {
      element.style.position = 'absolute';
      element.style.top = `${index * this.itemHeight}px`;
      element.style.left = '0';
      element.style.width = '100%';
      element.style.height = `${this.itemHeight}px`;
      
      this.itemsContainer.appendChild(element);
      this.renderedItems.add(index);
    }
  }

  removeItem(index) {
    const element = this.itemsContainer.children[index - this.startIndex];
    if (element) {
      this.onRemoveItem(element, index);
      element.remove();
      this.renderedItems.delete(index);
    }
  }

  scrollToItem(index) {
    if (index >= 0 && index < this.items.length) {
      const scrollTop = Math.max(0, (index * this.itemHeight) - (this.containerHeight / 2));
      this.container.scrollTop = scrollTop;
    }
  }

  updateItem(index, newItem) {
    if (index >= 0 && index < this.items.length) {
      this.items[index] = newItem;
      if (this.renderedItems.has(index)) {
        this.removeItem(index);
        this.renderItem(index);
      }
    }
  }

  destroy() {
    this.container.removeEventListener('scroll', this.handleScroll.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.clear();
  }

  clear() {
    this.items = [];
    this.renderedItems.clear();
    this.itemsContainer.innerHTML = '';
    this.updateContainerHeight();
  }
}

class ImageLazyLoader {
  constructor(options = {}) {
    this.imageObserver = null;
    this.loadedImages = new WeakSet();
    this.options = {
      rootMargin: options.rootMargin || '50px',
      threshold: options.threshold || 0.01,
      placeholder: options.placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4=',
      ...options
    };
    
    this.init();
  }

  init() {
    if ('IntersectionObserver' in window) {
      this.imageObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        this.options
      );
    }
  }

  handleIntersection(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }

  loadImage(img) {
    if (this.loadedImages.has(img)) {
      return;
    }

    const src = img.dataset.src;
    const srcset = img.dataset.srcset;
    
    if (!src && !srcset) {
      return;
    }

    img.classList.add('lazy-loading');
    
    const newImg = new Image();
    
    newImg.onload = () => {
      img.src = src;
      if (srcset) img.srcset = srcset;
      
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');
      
      this.loadedImages.add(img);
    };

    newImg.onerror = () => {
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-error');
      console.error('Failed to load image:', src || srcset);
    };

    if (srcset) newImg.srcset = srcset;
    newImg.src = src;
  }

  observe(element) {
    if (this.imageObserver) {
      this.imageObserver.observe(element);
    } else {
      // Fallback: load immediately if IntersectionObserver not supported
      this.loadImage(element);
    }
  }

  unobserve(element) {
    if (this.imageObserver) {
      this.imageObserver.unobserve(element);
    }
  }

  observeImages(container = document) {
    const images = container.querySelectorAll('img[data-src], img[data-srcset]');
    images.forEach(img => this.observe(img));
  }

  static createPlaceholder(width, height, color = '#ccc') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    return canvas.toDataURL();
  }
}

class ProgressiveLoader {
  constructor(options = {}) {
    this.observers = new Map();
    this.loadingStates = new WeakMap();
    this.options = {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '0px',
      ...options
    };
  }

  observe(element, config = {}) {
    const observer = new IntersectionObserver(
      (entries) => this.handleProgressiveLoad(entries, config),
      this.options
    );
    
    this.observers.set(element, observer);
    observer.observe(element);
  }

  handleProgressiveLoad(entries, config) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadElement(entry.target, config);
      }
    });
  }

  async loadElement(element, config) {
    if (this.loadingStates.has(element)) {
      return;
    }

    this.loadingStates.set(element, 'loading');
    element.classList.add('progressive-loading');

    try {
      const phases = this.getLoadingPhases(config);
      
      for (const phase of phases) {
        await this.executePhase(element, phase);
      }
      
      this.loadingStates.set(element, 'loaded');
      element.classList.remove('progressive-loading');
      element.classList.add('progressive-loaded');
      
      // Cleanup observer
      const observer = this.observers.get(element);
      if (observer) {
        observer.disconnect();
        this.observers.delete(element);
      }
      
    } catch (error) {
      this.loadingStates.set(element, 'error');
      element.classList.remove('progressive-loading');
      element.classList.add('progressive-error');
      console.error('Progressive loading failed:', error);
    }
  }

  getLoadingPhases(config) {
    const phases = [];
    
    if (config.placeholder) {
      phases.push({
        type: 'placeholder',
        data: config.placeholder,
        duration: config.placeholderDuration || 0
      });
    }
    
    if (config.lowQuality) {
      phases.push({
        type: 'lowQuality',
        data: config.lowQuality,
        duration: config.lowQualityDuration || 200
      });
    }
    
    if (config.highQuality) {
      phases.push({
        type: 'highQuality',
        data: config.highQuality,
        duration: config.highQualityDuration || 0
      });
    }
    
    return phases;
  }

  async executePhase(element, phase) {
    return new Promise((resolve) => {
      setTimeout(() => {
        switch (phase.type) {
          case 'placeholder':
            this.setPlaceholder(element, phase.data);
            break;
          case 'lowQuality':
            this.setLowQuality(element, phase.data);
            break;
          case 'highQuality':
            this.setHighQuality(element, phase.data);
            break;
        }
        resolve();
      }, phase.duration);
    });
  }

  setPlaceholder(element, data) {
    if (element.tagName === 'IMG') {
      element.src = data;
    } else if (element.style) {
      element.style.backgroundImage = `url(${data})`;
    }
  }

  setLowQuality(element, data) {
    if (element.tagName === 'IMG') {
      element.src = data;
    } else if (element.style) {
      element.style.backgroundImage = `url(${data})`;
    }
  }

  setHighQuality(element, data) {
    if (element.tagName === 'IMG') {
      element.src = data;
    } else if (element.style) {
      element.style.backgroundImage = `url(${data})`;
    }
  }

  observeComponents(components = []) {
    components.forEach(component => {
      this.observe(component.element, component.config);
    });
  }
}

class LazyDataLoader {
  constructor(options = {}) {
    this.loadingStates = new Map();
    this.options = {
      chunkSize: options.chunkSize || 20,
      debounceDelay: options.debounceDelay || 300,
      ...options
    };
    this.debounceTimers = new Map();
  }

  loadInChunks(data, callback, options = {}) {
    const chunkSize = options.chunkSize || this.options.chunkSize;
    const chunks = this.splitIntoChunks(data, chunkSize);
    
    return new Promise((resolve) => {
      let processedChunks = 0;
      
      const processChunk = () => {
        if (processedChunks < chunks.length) {
          const chunk = chunks[processedChunks];
          callback(chunk, processedChunks);
          processedChunks++;
          
          setTimeout(processChunk, 0);
        } else {
          resolve();
        }
      };
      
      processChunk();
    });
  }

  splitIntoChunks(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  debounceLoad(key, loadFn, delay = null) {
    const debounceDelay = delay || this.options.debounceDelay;
    
    return new Promise((resolve, reject) => {
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key));
      }
      
      const timer = setTimeout(async () => {
        try {
          const result = await loadFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
        this.debounceTimers.delete(key);
      }, debounceDelay);
      
      this.debounceTimers.set(key, timer);
    });
  }

  async loadWithRetry(loadFn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await loadFn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  cancelDebounce(key) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
      this.debounceTimers.delete(key);
    }
  }

  clearAllDebounces() {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

// Utility functions
const lazyLoadingUtils = {
  // Check if element is in viewport
  isInViewport(element, offset = 0) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= -offset &&
      rect.left >= -offset &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) + offset
    );
  },

  // Get element visibility percentage
  getVisibilityPercentage(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
    
    if (visibleHeight <= 0 || visibleWidth <= 0) return 0;
    
    const visibleArea = visibleHeight * visibleWidth;
    const totalArea = rect.height * rect.width;
    
    return (visibleArea / totalArea) * 100;
  },

  // Throttle function for performance
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    
    return function (...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  },

  // Debounce function
  debounce(func, delay) {
    let timeoutId;
    
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
};

// Global instances
const lazyLoader = new ImageLazyLoader();
const progressiveLoader = new ProgressiveLoader();
const lazyDataLoader = new LazyDataLoader();

// Initialize lazy loading for the page
document.addEventListener('DOMContentLoaded', () => {
  // Observe all lazy images
  lazyLoader.observeImages();
  
  // Add CSS for lazy loading effects
  const style = document.createElement('style');
  style.textContent = `
    .lazy-loading {
      opacity: 0.5;
      filter: blur(1px);
      transition: opacity 0.3s ease, filter 0.3s ease;
    }
    
    .lazy-loaded {
      opacity: 1;
      filter: blur(0);
    }
    
    .lazy-error {
      opacity: 0.3;
    }
    
    .progressive-loading {
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }
    
    .progressive-loaded {
      opacity: 1;
    }
    
    .virtual-scroll-container {
      overflow-anchor: none;
    }
    
    .virtual-scroll-items > * {
      contain: layout paint;
    }
  `;
  document.head.appendChild(style);
});

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VirtualScroller,
    ImageLazyLoader,
    ProgressiveLoader,
    LazyDataLoader,
    lazyLoader,
    progressiveLoader,
    lazyDataLoader,
    lazyLoadingUtils
  };
} else if (typeof window !== 'undefined') {
  window.LazyLoadingSystem = {
    VirtualScroller,
    ImageLazyLoader,
    ProgressiveLoader,
    LazyDataLoader,
    lazyLoader,
    progressiveLoader,
    lazyDataLoader,
    lazyLoadingUtils
  };
}