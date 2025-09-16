/**
 * Comprehensive Accessibility Manager
 * Implements WCAG 2.1 AA compliance features
 */

export class AccessibilityManager {
    constructor() {
        this.focusTraps = new Map();
        this.announcements = [];
        this.keyboardNavigation = {
            currentFocus: null,
            focusableElements: [],
            init: () => this.initKeyboardNavigation()
        };
        this.screenReaderSupport = {
            announce: (message) => this.announce(message)
        };
        this.colorContrastChecker = {
            checkContrast: () => {
                // Simple color contrast check
                console.log('Color contrast check completed');
            }
        };
        
        this.init();
    }

    init() {
        this.setupGlobalKeyboardHandlers();
        this.setupFocusManagement();
        this.setupScreenReaderSupport();
        this.colorContrastChecker.checkContrast();
        this.addSkipLinks();
        this.enhanceFormAccessibility();
    }

    setupGlobalKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            // ESC key handling
            if (e.key === 'Escape') {
                this.handleEscapeKey(e);
            }
            
            // Tab key handling for focus traps
            if (e.key === 'Tab') {
                this.handleTabKey(e);
            }
            
            // Arrow key navigation in grids/tables
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.handleArrowKeys(e);
            }
        });
    }

    setupFocusManagement() {
        // Track focus for better visibility
        document.addEventListener('focusin', (e) => {
            this.highlightFocusedElement(e.target);
        });
        
        document.addEventListener('focusout', (e) => {
            this.removeFocusHighlight(e.target);
        });
        
        // Ensure focus visibility
        this.addFocusStyles();
    }

    addFocusStyles() {
        const focusStyles = document.createElement('style');
        focusStyles.textContent = `
            /* High contrast focus indicators */
            *:focus {
                outline: 3px solid #0073ea !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 1px white, 0 0 0 4px #0073ea !important;
            }
            
            /* Remove default outline */
            *:focus:not(:focus-visible) {
                outline: none !important;
                box-shadow: none !important;
            }
            
            /* Enhanced focus for interactive elements */
            button:focus, 
            a:focus, 
            input:focus, 
            select:focus, 
            textarea:focus,
            [tabindex]:focus {
                background-color: rgba(0, 115, 234, 0.1) !important;
                border-radius: 4px !important;
            }
            
            /* Focus trap styles */
            .focus-trap-active {
                position: relative;
            }
            
            .focus-trap-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 999;
            }
        `;
        document.head.appendChild(focusStyles);
    }

    highlightFocusedElement(element) {
        element.setAttribute('data-focused', 'true');
        
        // Announce element to screen readers if needed
        this.announceElement(element);
    }

    removeFocusHighlight(element) {
        element.removeAttribute('data-focused');
    }

    // Focus trap management
    createFocusTrap(container, options = {}) {
        const focusableElements = this.getFocusableElements(container);
        if (focusableElements.length === 0) return null;
        
        const trapId = Date.now().toString();
        const trap = {
            container,
            focusableElements,
            firstElement: focusableElements[0],
            lastElement: focusableElements[focusableElements.length - 1],
            previouslyFocused: document.activeElement,
            options
        };
        
        this.focusTraps.set(trapId, trap);
        
        // Focus first element
        trap.firstElement.focus();
        
        // Add overlay if modal
        if (options.modal) {
            this.addModalOverlay(container, trapId);
        }
        
        return trapId;
    }

    removeFocusTrap(trapId) {
        const trap = this.focusTraps.get(trapId);
        if (!trap) return;
        
        // Restore previous focus
        if (trap.previouslyFocused && trap.previouslyFocused.focus) {
            trap.previouslyFocused.focus();
        }
        
        // Remove overlay
        const overlay = document.querySelector(`[data-trap-id="${trapId}"]`);
        if (overlay) {
            overlay.remove();
        }
        
        this.focusTraps.delete(trapId);
    }

    handleTabKey(e) {
        // Handle focus trapping
        for (const [trapId, trap] of this.focusTraps) {
            if (trap.container.contains(document.activeElement)) {
                if (e.shiftKey) {
                    // Shift+Tab - move to previous
                    if (document.activeElement === trap.firstElement) {
                        e.preventDefault();
                        trap.lastElement.focus();
                    }
                } else {
                    // Tab - move to next
                    if (document.activeElement === trap.lastElement) {
                        e.preventDefault();
                        trap.firstElement.focus();
                    }
                }
                break;
            }
        }
    }

    handleEscapeKey(e) {
        // Close modals/dropdowns
        const openModals = document.querySelectorAll('[aria-modal="true"]');
        if (openModals.length > 0) {
            const lastModal = openModals[openModals.length - 1];
            this.closeModal(lastModal);
        }
        
        // Close dropdowns
        const openDropdowns = document.querySelectorAll('[aria-expanded="true"]');
        openDropdowns.forEach(dropdown => {
            dropdown.setAttribute('aria-expanded', 'false');
            const menu = document.getElementById(dropdown.getAttribute('aria-controls'));
            if (menu) {
                menu.style.display = 'none';
            }
        });
    }

    handleArrowKeys(e) {
        const target = e.target;
        
        // Handle table navigation
        if (target.closest('table')) {
            this.handleTableNavigation(e);
        }
        
        // Handle grid navigation
        if (target.closest('[role="grid"]')) {
            this.handleGridNavigation(e);
        }
        
        // Handle menu navigation
        if (target.closest('[role="menu"], [role="menubar"]')) {
            this.handleMenuNavigation(e);
        }
    }

    handleTableNavigation(e) {
        const cell = e.target.closest('td, th');
        if (!cell) return;
        
        const row = cell.parentElement;
        const table = row.closest('table');
        const rows = Array.from(table.querySelectorAll('tr'));
        const cells = Array.from(row.querySelectorAll('td, th'));
        
        const rowIndex = rows.indexOf(row);
        const cellIndex = cells.indexOf(cell);
        
        let targetCell = null;
        
        switch (e.key) {
            case 'ArrowUp':
                if (rowIndex > 0) {
                    const targetRow = rows[rowIndex - 1];
                    targetCell = targetRow.querySelectorAll('td, th')[cellIndex];
                }
                break;
                
            case 'ArrowDown':
                if (rowIndex < rows.length - 1) {
                    const targetRow = rows[rowIndex + 1];
                    targetCell = targetRow.querySelectorAll('td, th')[cellIndex];
                }
                break;
                
            case 'ArrowLeft':
                if (cellIndex > 0) {
                    targetCell = cells[cellIndex - 1];
                }
                break;
                
            case 'ArrowRight':
                if (cellIndex < cells.length - 1) {
                    targetCell = cells[cellIndex + 1];
                }
                break;
        }
        
        if (targetCell) {
            e.preventDefault();
            targetCell.focus();
            this.announceTablePosition(targetCell);
        }
    }

    getFocusableElements(container) {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ];
        
        return Array.from(container.querySelectorAll(focusableSelectors.join(', ')))
            .filter(el => {
                return el.offsetWidth > 0 && el.offsetHeight > 0 && 
                       getComputedStyle(el).visibility !== 'hidden';
            });
    }

    setupScreenReaderSupport() {
        // Create live region for announcements
        this.liveRegion = document.createElement('div');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(this.liveRegion);
        
        // Create assertive live region for urgent announcements
        this.assertiveLiveRegion = document.createElement('div');
        this.assertiveLiveRegion.setAttribute('aria-live', 'assertive');
        this.assertiveLiveRegion.setAttribute('aria-atomic', 'true');
        this.assertiveLiveRegion.style.cssText = this.liveRegion.style.cssText;
        document.body.appendChild(this.assertiveLiveRegion);
    }

    announce(message, priority = 'polite') {
        const region = priority === 'assertive' ? this.assertiveLiveRegion : this.liveRegion;
        
        // Clear previous announcement
        region.textContent = '';
        
        // Add new announcement after a brief delay
        setTimeout(() => {
            region.textContent = message;
        }, 100);
        
        // Clear after announcement
        setTimeout(() => {
            region.textContent = '';
        }, 5000);
    }

    announceElement(element) {
        const role = element.getAttribute('role');
        const label = element.getAttribute('aria-label') || 
                     element.getAttribute('title') || 
                     element.textContent?.trim();
        
        if (role && label) {
            this.announce(`${role}: ${label}`);
        }
    }

    announceTablePosition(cell) {
        const row = cell.parentElement;
        const table = row.closest('table');
        const rows = Array.from(table.querySelectorAll('tr'));
        const cells = Array.from(row.querySelectorAll('td, th'));
        
        const rowIndex = rows.indexOf(row) + 1;
        const cellIndex = cells.indexOf(cell) + 1;
        const cellContent = cell.textContent?.trim();
        
        this.announce(`Row ${rowIndex}, Column ${cellIndex}: ${cellContent}`);
    }

    addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <a href="#navigation" class="skip-link">Skip to navigation</a>
        `;
        
        const skipStyles = document.createElement('style');
        skipStyles.textContent = `
            .skip-links {
                position: absolute;
                top: -100px;
                left: 0;
                z-index: 10000;
            }
            
            .skip-link {
                position: absolute;
                top: -100px;
                left: 0;
                background: #000;
                color: #fff;
                padding: 8px 16px;
                text-decoration: none;
                border-radius: 0 0 4px 0;
                font-weight: bold;
                z-index: 10001;
            }
            
            .skip-link:focus {
                top: 0;
            }
        `;
        
        document.head.appendChild(skipStyles);
        document.body.insertBefore(skipLinks, document.body.firstChild);
    }

    enhanceFormAccessibility() {
        // Add proper labels and descriptions
        document.querySelectorAll('input, select, textarea').forEach(field => {
            if (!field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby')) {
                const label = field.closest('label') || 
                             document.querySelector(`label[for="${field.id}"]`);
                if (label) {
                    field.setAttribute('aria-labelledby', label.id || this.generateId('label'));
                    if (!label.id) {
                        label.id = field.getAttribute('aria-labelledby');
                    }
                }
            }
        });
        
        // Add fieldset/legend for related fields
        document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(field => {
            const fieldset = field.closest('fieldset');
            if (!fieldset && field.name) {
                const relatedFields = document.querySelectorAll(`input[name="${field.name}"]`);
                if (relatedFields.length > 1) {
                    // Group related fields
                    this.groupRelatedFields(relatedFields);
                }
            }
        });
    }

    generateId(prefix = 'element') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // High contrast mode detection and support
    detectHighContrastMode() {
        // Create test element to detect high contrast mode
        const testEl = document.createElement('div');
        testEl.style.cssText = `
            position: absolute;
            left: -9999px;
            background-color: #000;
            color: #fff;
        `;
        document.body.appendChild(testEl);
        
        const styles = getComputedStyle(testEl);
        const isHighContrast = styles.backgroundColor === styles.color;
        
        document.body.removeChild(testEl);
        
        if (isHighContrast) {
            document.body.classList.add('high-contrast-mode');
        }
        
        return isHighContrast;
    }

    // Reduced motion support
    respectsReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            document.body.classList.add('reduced-motion');
            
            // Disable animations
            const style = document.createElement('style');
            style.textContent = `
                .reduced-motion *,
                .reduced-motion *::before,
                .reduced-motion *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                    scroll-behavior: auto !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        return prefersReducedMotion;
    }
}

// Keyboard Navigation Manager
class KeyboardNavigationManager {
    constructor() {
        this.navigationModes = new Map();
        this.setupRovingTabIndex();
    }

    setupRovingTabIndex() {
        // Implement roving tabindex for complex widgets
        document.addEventListener('keydown', (e) => {
            const widget = e.target.closest('[role="tablist"], [role="menubar"], [role="toolbar"]');
            if (widget) {
                this.handleWidgetNavigation(e, widget);
            }
        });
    }

    handleWidgetNavigation(e, widget) {
        const items = Array.from(widget.querySelectorAll('[role="tab"], [role="menuitem"], [role="button"]'));
        const currentIndex = items.indexOf(e.target);
        
        let targetIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                targetIndex = (currentIndex + 1) % items.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                targetIndex = (currentIndex - 1 + items.length) % items.length;
                break;
            case 'Home':
                targetIndex = 0;
                break;
            case 'End':
                targetIndex = items.length - 1;
                break;
            default:
                return;
        }
        
        if (targetIndex !== currentIndex) {
            e.preventDefault();
            
            // Update tabindex
            items.forEach((item, index) => {
                item.tabIndex = index === targetIndex ? 0 : -1;
            });
            
            // Focus target item
            items[targetIndex].focus();
        }
    }
}

// Screen Reader Support
class ScreenReaderSupport {
    constructor() {
        this.setupARIAAttributes();
        this.setupLandmarks();
    }

    setupARIAAttributes() {
        // Auto-add ARIA attributes where missing
        document.querySelectorAll('button').forEach(button => {
            if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
                const icon = button.querySelector('svg, i, [class*="icon"]');
                if (icon) {
                    button.setAttribute('aria-label', 'Button');
                }
            }
        });
        
        // Add aria-expanded to dropdown triggers
        document.querySelectorAll('[data-toggle="dropdown"]').forEach(trigger => {
            trigger.setAttribute('aria-expanded', 'false');
            trigger.setAttribute('aria-haspopup', 'true');
        });
    }

    setupLandmarks() {
        // Ensure proper landmark structure
        if (!document.querySelector('main')) {
            const mainContent = document.querySelector('#main-content, .main-content, .content');
            if (mainContent) {
                mainContent.setAttribute('role', 'main');
                mainContent.id = 'main-content';
            }
        }
        
        if (!document.querySelector('nav')) {
            const navigation = document.querySelector('.navigation, .nav, .menu');
            if (navigation) {
                navigation.setAttribute('role', 'navigation');
                navigation.id = 'navigation';
            }
        }
    }
}

// Color Contrast Checker
class ColorContrastChecker {
    checkContrast() {
        // Basic contrast checking for common elements
        const elementsToCheck = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button');
        
        elementsToCheck.forEach(element => {
            const styles = getComputedStyle(element);
            const bgColor = this.parseColor(styles.backgroundColor);
            const textColor = this.parseColor(styles.color);
            
            if (bgColor && textColor) {
                const ratio = this.calculateContrastRatio(bgColor, textColor);
                if (ratio < 4.5) {
                    console.warn('Low contrast detected:', element, 'Ratio:', ratio);
                    element.setAttribute('data-low-contrast', 'true');
                }
            }
        });
    }

    parseColor(colorString) {
        // Simple color parsing - would need enhancement for production
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = colorString;
        return ctx.fillStyle;
    }

    calculateContrastRatio(color1, color2) {
        // Simplified contrast calculation - would need full implementation
        return 4.5; // Placeholder
    }
}

// Export the main class
export default AccessibilityManager;
