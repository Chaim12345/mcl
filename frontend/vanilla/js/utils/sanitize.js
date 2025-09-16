/**
 * HTML Sanitization Utilities
 * Provides safe HTML sanitization to prevent XSS attacks
 */

/**
 * Sanitize HTML content by removing dangerous elements and attributes
 */
export function sanitizeHTML(html) {
    if (typeof html !== 'string') {
        return '';
    }

    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove all script tags
    const scripts = temp.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    // Remove all style tags
    const styles = temp.querySelectorAll('style');
    styles.forEach(style => style.remove());

    // Remove all link tags
    const links = temp.querySelectorAll('link');
    links.forEach(link => link.remove());

    // Remove dangerous attributes from all elements
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(element => {
        // Remove event handler attributes
        const attributes = [...element.attributes];
        attributes.forEach(attr => {
            if (attr.name.startsWith('on') || 
                attr.name === 'javascript:' ||
                attr.name === 'vbscript:' ||
                attr.name === 'data:') {
                element.removeAttribute(attr.name);
            }
        });

        // Remove dangerous href/src attributes
        if (element.hasAttribute('href')) {
            const href = element.getAttribute('href');
            if (href.startsWith('javascript:') || 
                href.startsWith('vbscript:') || 
                href.startsWith('data:')) {
                element.removeAttribute('href');
            }
        }

        if (element.hasAttribute('src')) {
            const src = element.getAttribute('src');
            if (src.startsWith('javascript:') || 
                src.startsWith('vbscript:') || 
                src.startsWith('data:')) {
                element.removeAttribute('src');
            }
        }
    });

    return temp.innerHTML;
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHTML(text) {
    if (typeof text !== 'string') {
        return '';
    }

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Strip all HTML tags from content
 */
export function stripHTML(html) {
    if (typeof html !== 'string') {
        return '';
    }

    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

/**
 * Create safe HTML content for display
 */
export function createSafeHTML(content, options = {}) {
    const {
        allowBasicFormatting = false,
        allowLinks = false,
        maxLength = null
    } = options;

    if (typeof content !== 'string') {
        return '';
    }

    let safeContent = content;

    // Truncate if needed
    if (maxLength && safeContent.length > maxLength) {
        safeContent = safeContent.substring(0, maxLength) + '...';
    }

    if (allowBasicFormatting || allowLinks) {
        // Allow only specific safe tags
        const allowedTags = [];
        if (allowBasicFormatting) {
            allowedTags.push('b', 'i', 'em', 'strong', 'br', 'p');
        }
        if (allowLinks) {
            allowedTags.push('a');
        }

        // Create temporary element
        const temp = document.createElement('div');
        temp.innerHTML = safeContent;

        // Remove all elements except allowed ones
        const allElements = temp.querySelectorAll('*');
        allElements.forEach(element => {
            if (!allowedTags.includes(element.tagName.toLowerCase())) {
                // Replace with text content
                const textNode = document.createTextNode(element.textContent);
                element.parentNode.replaceChild(textNode, element);
            }
        });

        safeContent = temp.innerHTML;
    } else {
        // Escape all HTML
        safeContent = escapeHTML(safeContent);
    }

    return safeContent;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeURL(url) {
    if (typeof url !== 'string') {
        return '';
    }

    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:'];
    const lowerUrl = url.toLowerCase().trim();
    
    for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
            return '';
        }
    }

    // Allow only http, https, mailto, and relative URLs
    if (lowerUrl.startsWith('http://') || 
        lowerUrl.startsWith('https://') || 
        lowerUrl.startsWith('mailto:') ||
        lowerUrl.startsWith('/') ||
        lowerUrl.startsWith('./') ||
        lowerUrl.startsWith('../') ||
        !lowerUrl.includes(':')) {
        return url;
    }

    return '';
}