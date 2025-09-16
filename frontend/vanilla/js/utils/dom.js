/**
 * DOM Manipulation Utilities
 */

/**
 * Create an element with attributes and content
 */
export function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Set content
    if (typeof content === 'string') {
        // Use textContent for safety unless explicitly marked as HTML
        if (attributes.dangerouslySetInnerHTML) {
            element.innerHTML = content;
        } else {
            element.textContent = content;
        }
    } else if (content instanceof Node) {
        element.appendChild(content);
    } else if (Array.isArray(content)) {
        content.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
    }
    
    return element;
}

/**
 * Query selector with caching
 */
const queryCache = new Map();

export function $(selector, context = document) {
    const cacheKey = `${selector}:${context === document ? 'document' : context.tagName}`;
    
    if (queryCache.has(cacheKey)) {
        const cached = queryCache.get(cacheKey);
        // Check if cached element is still in DOM
        if (cached && document.contains(cached)) {
            return cached;
        }
        queryCache.delete(cacheKey);
    }
    
    const element = context.querySelector(selector);
    if (element) {
        queryCache.set(cacheKey, element);
    }
    
    return element;
}

/**
 * Query selector all
 */
export function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

/**
 * Clear query cache
 */
export function clearQueryCache() {
    queryCache.clear();
}

/**
 * Class manipulation utilities
 */
export const classes = {
    add(element, ...classNames) {
        element.classList.add(...classNames);
        return element;
    },
    
    remove(element, ...classNames) {
        element.classList.remove(...classNames);
        return element;
    },
    
    toggle(element, className, force) {
        return element.classList.toggle(className, force);
    },
    
    has(element, className) {
        return element.classList.contains(className);
    },
    
    replace(element, oldClass, newClass) {
        element.classList.replace(oldClass, newClass);
        return element;
    }
};

/**
 * Style utilities
 */
export const styles = {
    set(element, styles) {
        Object.entries(styles).forEach(([property, value]) => {
            element.style[property] = value;
        });
        return element;
    },
    
    get(element, property) {
        return getComputedStyle(element)[property];
    },
    
    remove(element, ...properties) {
        properties.forEach(property => {
            element.style.removeProperty(property);
        });
        return element;
    }
};

/**
 * Attribute utilities
 */
export const attrs = {
    set(element, attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    },
    
    get(element, attribute) {
        return element.getAttribute(attribute);
    },
    
    remove(element, ...attributes) {
        attributes.forEach(attr => element.removeAttribute(attr));
        return element;
    },
    
    has(element, attribute) {
        return element.hasAttribute(attribute);
    }
};

/**
 * Data attribute utilities
 */
export const data = {
    set(element, key, value) {
        element.dataset[key] = value;
        return element;
    },
    
    get(element, key) {
        return element.dataset[key];
    },
    
    remove(element, key) {
        delete element.dataset[key];
        return element;
    },
    
    has(element, key) {
        return key in element.dataset;
    }
};

/**
 * Event delegation utility
 */
export function delegate(container, selector, event, handler) {
    const delegatedHandler = (e) => {
        const target = e.target.closest(selector);
        if (target && container.contains(target)) {
            handler.call(target, e);
        }
    };
    
    container.addEventListener(event, delegatedHandler);
    
    // Return cleanup function
    return () => container.removeEventListener(event, delegatedHandler);
}

/**
 * DOM ready utility
 */
export function ready(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

/**
 * Animation utilities
 */
export const animate = {
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        return new Promise(resolve => {
            const start = performance.now();
            
            function frame(time) {
                const progress = Math.min((time - start) / duration, 1);
                element.style.opacity = progress;
                
                if (progress < 1) {
                    requestAnimationFrame(frame);
                } else {
                    resolve();
                }
            }
            
            requestAnimationFrame(frame);
        });
    },
    
    fadeOut(element, duration = 300) {
        return new Promise(resolve => {
            const start = performance.now();
            const startOpacity = parseFloat(getComputedStyle(element).opacity);
            
            function frame(time) {
                const progress = Math.min((time - start) / duration, 1);
                element.style.opacity = startOpacity * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(frame);
                } else {
                    element.style.display = 'none';
                    resolve();
                }
            }
            
            requestAnimationFrame(frame);
        });
    },
    
    slideDown(element, duration = 300) {
        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.display = 'block';
        
        const targetHeight = element.scrollHeight;
        
        return new Promise(resolve => {
            const start = performance.now();
            
            function frame(time) {
                const progress = Math.min((time - start) / duration, 1);
                element.style.height = `${targetHeight * progress}px`;
                
                if (progress < 1) {
                    requestAnimationFrame(frame);
                } else {
                    element.style.height = '';
                    element.style.overflow = '';
                    resolve();
                }
            }
            
            requestAnimationFrame(frame);
        });
    },
    
    slideUp(element, duration = 300) {
        const startHeight = element.offsetHeight;
        element.style.height = `${startHeight}px`;
        element.style.overflow = 'hidden';
        
        return new Promise(resolve => {
            const start = performance.now();
            
            function frame(time) {
                const progress = Math.min((time - start) / duration, 1);
                element.style.height = `${startHeight * (1 - progress)}px`;
                
                if (progress < 1) {
                    requestAnimationFrame(frame);
                } else {
                    element.style.display = 'none';
                    element.style.height = '';
                    element.style.overflow = '';
                    resolve();
                }
            }
            
            requestAnimationFrame(frame);
        });
    }
};

/**
 * Position utilities
 */
export const position = {
    getOffset(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset,
            width: rect.width,
            height: rect.height
        };
    },
    
    getViewportPosition(element) {
        return element.getBoundingClientRect();
    },
    
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );
    }
};

/**
 * Scroll utilities
 */
export const scroll = {
    to(element, options = {}) {
        const { behavior = 'smooth', block = 'start', inline = 'nearest' } = options;
        element.scrollIntoView({ behavior, block, inline });
    },
    
    toTop(options = {}) {
        const { behavior = 'smooth' } = options;
        window.scrollTo({ top: 0, behavior });
    },
    
    getPosition() {
        return {
            x: window.pageXOffset,
            y: window.pageYOffset
        };
    }
};

/**
 * Form utilities
 */
export const form = {
    serialize(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            if (data[key]) {
                // Handle multiple values (checkboxes, multi-select)
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    },
    
    validate(formElement) {
        return formElement.checkValidity();
    },
    
    reset(formElement) {
        formElement.reset();
        // Clear custom validation messages
        const inputs = formElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => input.setCustomValidity(''));
    }
};

/**
 * Template utilities
 */
export const template = {
    render(templateString, data = {}) {
        return templateString.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || '';
        });
    },
    
    compile(templateString) {
        return (data = {}) => template.render(templateString, data);
    }
};