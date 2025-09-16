/**
 * Production-Ready Mobile-First Component Library
 * Touch-friendly components with modern UI patterns
 */

export class MobileFirstComponents {
    constructor() {
        this.init();
    }

    init() {
        this.setupTouchInteractions();
        this.setupSwipeGestures();
        this.setupKeyboardNavigation();
        this.setupAccessibility();
    }

    // Button Component
    createButton(options = {}) {
        const {
            text = 'Button',
            variant = 'primary', // primary, secondary, outline, ghost, danger
            size = 'md', // sm, md, lg
            icon = null,
            loading = false,
            disabled = false,
            onClick = null,
            className = ''
        } = options;

        const button = document.createElement('button');
        button.className = `btn btn-${variant} btn-${size} ${className}`;
        button.disabled = disabled || loading;
        
        if (loading) {
            button.innerHTML = `
                <div class="btn-loading">
                    <div class="spinner spinner-sm"></div>
                    <span>Loading...</span>
                </div>
            `;
        } else {
            button.innerHTML = `
                ${icon ? `<span class="btn-icon">${icon}</span>` : ''}
                <span class="btn-text">${text}</span>
            `;
        }

        if (onClick) {
            button.addEventListener('click', onClick);
        }

        return button;
    }

    // Input Component
    createInput(options = {}) {
        const {
            type = 'text',
            placeholder = '',
            value = '',
            label = '',
            error = '',
            help = '',
            required = false,
            disabled = false,
            icon = null,
            className = ''
        } = options;

        const container = document.createElement('div');
        container.className = `input-group ${className}`;

        const labelEl = label ? `<label class="input-label">${label}${required ? ' *' : ''}</label>` : '';
        const iconEl = icon ? `<span class="input-icon">${icon}</span>` : '';
        const errorEl = error ? `<div class="input-error">${error}</div>` : '';
        const helpEl = help ? `<div class="input-help">${help}</div>` : '';

        container.innerHTML = `
            ${labelEl}
            <div class="input-wrapper">
                ${iconEl}
                <input 
                    type="${type}" 
                    placeholder="${placeholder}" 
                    value="${value}"
                    ${required ? 'required' : ''}
                    ${disabled ? 'disabled' : ''}
                    class="input-field"
                >
            </div>
            ${errorEl}
            ${helpEl}
        `;

        return container;
    }

    // Card Component
    createCard(options = {}) {
        const {
            title = '',
            subtitle = '',
            content = '',
            actions = [],
            image = null,
            className = ''
        } = options;

        const card = document.createElement('div');
        card.className = `card ${className}`;

        const imageEl = image ? `<div class="card-image"><img src="${image}" alt="${title}"></div>` : '';
        const titleEl = title ? `<h3 class="card-title">${title}</h3>` : '';
        const subtitleEl = subtitle ? `<p class="card-subtitle">${subtitle}</p>` : '';
        const actionsEl = actions.length > 0 ? `
            <div class="card-actions">
                ${actions.map(action => this.createButton(action).outerHTML).join('')}
            </div>
        ` : '';

        card.innerHTML = `
            ${imageEl}
            <div class="card-content">
                ${titleEl}
                ${subtitleEl}
                <div class="card-body">${content}</div>
                ${actionsEl}
            </div>
        `;

        return card;
    }

    // Modal Component
    createModal(options = {}) {
        const {
            title = '',
            content = '',
            size = 'md', // sm, md, lg, xl
            closable = true,
            actions = [],
            onClose = null,
            className = ''
        } = options;

        const modal = document.createElement('div');
        modal.className = `modal modal-${size} ${className}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        const actionsEl = actions.length > 0 ? `
            <div class="modal-actions">
                ${actions.map(action => this.createButton(action).outerHTML).join('')}
            </div>
        ` : '';

        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    ${closable ? '<button class="modal-close" aria-label="Close">&times;</button>' : ''}
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${actionsEl}
            </div>
        `;

        // Add event listeners
        if (closable) {
            const closeBtn = modal.querySelector('.modal-close');
            const backdrop = modal.querySelector('.modal-backdrop');
            
            const closeModal = () => {
                modal.classList.add('modal-closing');
                setTimeout(() => {
                    modal.remove();
                    if (onClose) onClose();
                }, 300);
            };

            closeBtn.addEventListener('click', closeModal);
            backdrop.addEventListener('click', closeModal);
        }

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape' && closable) {
                modal.querySelector('.modal-close').click();
            }
        };
        document.addEventListener('keydown', handleEscape);

        return modal;
    }

    // Toast Notification Component
    createToast(options = {}) {
        const {
            message = '',
            type = 'info', // success, error, warning, info
            duration = 5000,
            closable = true,
            position = 'top-right' // top-left, top-right, bottom-left, bottom-right
        } = options;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-${position}`;
        toast.setAttribute('role', 'alert');

        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${iconMap[type]}</span>
                <span class="toast-message">${message}</span>
                ${closable ? '<button class="toast-close" aria-label="Close">&times;</button>' : ''}
            </div>
            <div class="toast-progress"></div>
        `;

        // Add to container
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        container.appendChild(toast);

        // Auto-remove
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }

        // Manual close
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.removeToast(toast));
        }

        return toast;
    }

    removeToast(toast) {
        toast.classList.add('toast-removing');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }

    // Dropdown Component
    createDropdown(options = {}) {
        const {
            trigger = null,
            items = [],
            position = 'bottom-left', // bottom-left, bottom-right, top-left, top-right
            className = ''
        } = options;

        const dropdown = document.createElement('div');
        dropdown.className = `dropdown dropdown-${position} ${className}`;

        const triggerEl = trigger || this.createButton({ text: 'Options', variant: 'outline' });
        triggerEl.classList.add('dropdown-trigger');
        triggerEl.setAttribute('aria-haspopup', 'true');
        triggerEl.setAttribute('aria-expanded', 'false');

        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.setAttribute('role', 'menu');

        menu.innerHTML = items.map(item => `
            <div class="dropdown-item" data-value="${item.value || ''}">
                ${item.icon ? `<span class="dropdown-icon">${item.icon}</span>` : ''}
                <span class="dropdown-text">${item.text}</span>
                ${item.shortcut ? `<span class="dropdown-shortcut">${item.shortcut}</span>` : ''}
            </div>
        `).join('');

        dropdown.appendChild(triggerEl);
        dropdown.appendChild(menu);

        // Toggle dropdown
        triggerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('dropdown-open');
            
            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(m => {
                m.classList.remove('dropdown-open');
                m.previousElementSibling.setAttribute('aria-expanded', 'false');
            });

            if (!isOpen) {
                menu.classList.add('dropdown-open');
                triggerEl.setAttribute('aria-expanded', 'true');
            }
        });

        // Handle item clicks
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (item && item.dataset.value) {
                const value = item.dataset.value;
                const text = item.querySelector('.dropdown-text').textContent;
                
                if (items.find(i => i.value === value)?.onClick) {
                    items.find(i => i.value === value).onClick(value, text);
                }
                
                menu.classList.remove('dropdown-open');
                triggerEl.setAttribute('aria-expanded', 'false');
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                menu.classList.remove('dropdown-open');
                triggerEl.setAttribute('aria-expanded', 'false');
            }
        });

        return dropdown;
    }

    // Loading Spinner Component
    createSpinner(options = {}) {
        const {
            size = 'md', // sm, md, lg
            color = 'primary',
            text = '',
            className = ''
        } = options;

        const spinner = document.createElement('div');
        spinner.className = `spinner-container spinner-${size} spinner-${color} ${className}`;

        spinner.innerHTML = `
            <div class="spinner"></div>
            ${text ? `<span class="spinner-text">${text}</span>` : ''}
        `;

        return spinner;
    }

    // Progress Bar Component
    createProgressBar(options = {}) {
        const {
            value = 0,
            max = 100,
            size = 'md', // sm, md, lg
            color = 'primary',
            showLabel = true,
            className = ''
        } = options;

        const progress = document.createElement('div');
        progress.className = `progress progress-${size} progress-${color} ${className}`;

        const percentage = Math.min(100, Math.max(0, (value / max) * 100));

        progress.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
            ${showLabel ? `<div class="progress-label">${Math.round(percentage)}%</div>` : ''}
        `;

        return progress;
    }

    // Setup touch interactions
    setupTouchInteractions() {
        // Add touch feedback to interactive elements
        document.addEventListener('touchstart', (e) => {
            const element = e.target.closest('button, [role="button"], .clickable');
            if (element) {
                element.classList.add('touch-active');
            }
        });

        document.addEventListener('touchend', (e) => {
            const element = e.target.closest('button, [role="button"], .clickable');
            if (element) {
                element.classList.remove('touch-active');
            }
        });
    }

    // Setup swipe gestures
    setupSwipeGestures() {
        let startX, startY, endX, endY;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const minSwipeDistance = 50;

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                const swipeEvent = new CustomEvent('swipe', {
                    detail: {
                        direction: deltaX > 0 ? 'right' : 'left',
                        distance: Math.abs(deltaX),
                        element: e.target
                    }
                });
                document.dispatchEvent(swipeEvent);
            }
        });
    }

    // Setup keyboard navigation
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Handle arrow key navigation
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const focusableElements = document.querySelectorAll(
                    'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                
                const currentIndex = Array.from(focusableElements).indexOf(document.activeElement);
                let nextIndex = currentIndex;

                switch (e.key) {
                    case 'ArrowDown':
                    case 'ArrowRight':
                        nextIndex = (currentIndex + 1) % focusableElements.length;
                        break;
                    case 'ArrowUp':
                    case 'ArrowLeft':
                        nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
                        break;
                }

                if (nextIndex !== currentIndex) {
                    e.preventDefault();
                    focusableElements[nextIndex].focus();
                }
            }
        });
    }

    // Setup accessibility
    setupAccessibility() {
        // Add ARIA labels to interactive elements without labels
        document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
            if (!button.textContent.trim()) {
                button.setAttribute('aria-label', 'Button');
            }
        });

        // Add skip links
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
}

// Export the component library
export default MobileFirstComponents;
