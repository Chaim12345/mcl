/**
 * Enhanced Button Component
 * Monday.com Vibe-inspired button with advanced features
 */

import { Component } from '../base/Component.js';

export class EnhancedButton extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            loading: false,
            disabled: false,
            pressed: false,
            ...options.initialState
        };
        
        // Button configuration
        this.size = options.size || 'medium'; // xs, small, medium, large
        this.kind = options.kind || 'primary'; // primary, secondary, tertiary
        this.color = options.color || 'primary'; // primary, positive, negative, warning
        this.leftIcon = options.leftIcon;
        this.rightIcon = options.rightIcon;
        this.text = options.text || '';
        this.ariaLabel = options.ariaLabel || this.text;
        this.disabled = options.disabled || false;
        this.loading = options.loading || false;
        this.success = options.success || false;
        this.onClick = options.onClick;
        this.onMouseEnter = options.onMouseEnter;
        this.onMouseLeave = options.onMouseLeave;
        this.onFocus = options.onFocus;
        this.onBlur = options.onBlur;
        
        // Ripple effect configuration
        this.enableRipple = options.enableRipple !== false;
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
    }
    
    render() {
        const sizeClass = `btn--${this.size}`;
        const kindClass = `btn--${this.kind}`;
        const colorClass = `btn--${this.color}`;
        const stateClasses = [
            this.state.loading ? 'btn--loading' : '',
            this.state.disabled || this.disabled ? 'btn--disabled' : '',
            this.state.pressed ? 'btn--pressed' : '',
            this.success ? 'btn--success' : ''
        ].filter(Boolean).join(' ');
        
        this.container.innerHTML = `
            <button 
                class="enhanced-btn ${sizeClass} ${kindClass} ${colorClass} ${stateClasses}"
                type="button"
                aria-label="${this.ariaLabel}"
                ${this.state.disabled || this.disabled ? 'disabled' : ''}
                ${this.state.loading ? 'aria-busy="true"' : ''}
                data-testid="enhanced-button"
            >
                <span class="btn-content">
                    ${this.renderLeftIcon()}
                    ${this.renderText()}
                    ${this.renderRightIcon()}
                </span>
                ${this.renderLoader()}
                ${this.renderRipple()}
            </button>
        `;
    }
    
    renderLeftIcon() {
        if (!this.leftIcon || this.state.loading) return '';
        
        return `
            <span class="btn-icon btn-icon--left" aria-hidden="true">
                ${this.renderIcon(this.leftIcon)}
            </span>
        `;
    }
    
    renderRightIcon() {
        if (!this.rightIcon || this.state.loading) return '';
        
        return `
            <span class="btn-icon btn-icon--right" aria-hidden="true">
                ${this.renderIcon(this.rightIcon)}
            </span>
        `;
    }
    
    renderText() {
        if (!this.text) return '';
        
        return `
            <span class="btn-text" ${this.state.loading ? 'style="opacity: 0.7"' : ''}>
                ${this.escapeHtml(this.text)}
            </span>
        `;
    }
    
    renderIcon(iconName) {
        // Simple icon rendering - in real implementation you'd use an icon library
        const iconMap = {
            'plus': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
            'check': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20,6 9,17 4,12"></polyline></svg>',
            'x': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
            'chevron-right': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9,18 15,12 9,6"></polyline></svg>',
            'chevron-left': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15,18 9,12 15,6"></polyline></svg>',
            'download': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7,10 12,15 17,10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
            'upload': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17,8 12,3 7,8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
            'settings': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"></circle><path d="m12 1 3 6 6 3-3 6-6 3-3-6-6-3 3-6 6-3z"></path></svg>',
            'edit': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
            'delete': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0,0,1-2,2H7a2,2 0,0,1-2-2V6m3,0V4a2,2 0,0,1,2-2h4a2,2 0,0,1,2,2V6"></path></svg>'
        };
        
        return iconMap[iconName] || iconName;
    }
    
    renderLoader() {
        if (!this.state.loading) return '';
        
        return `
            <span class="btn-loader" aria-hidden="true">
                <svg class="btn-spinner" width="16" height="16" viewBox="0 0 24 24">
                    <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>
            </span>
        `;
    }
    
    renderRipple() {
        if (!this.enableRipple) return '';
        
        return '<span class="btn-ripple" aria-hidden="true"></span>';
    }
    
    bindEvents() {
        const button = this.container.querySelector('.enhanced-btn');
        if (!button) return;
        
        button.addEventListener('click', this.handleClick.bind(this));
        button.addEventListener('mousedown', this.handleMouseDown.bind(this));
        button.addEventListener('mouseup', this.handleMouseUp.bind(this));
        button.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        button.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        button.addEventListener('focus', this.handleFocus.bind(this));
        button.addEventListener('blur', this.handleBlur.bind(this));
        button.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        if (this.enableRipple) {
            button.addEventListener('click', this.createRipple.bind(this));
        }
    }
    
    handleClick(event) {
        if (this.state.disabled || this.disabled || this.state.loading) {
            event.preventDefault();
            return;
        }
        
        // Trigger success state briefly
        if (this.success) {
            this.showSuccessState();
        }
        
        if (this.onClick) {
            this.onClick(event);
        }
        
        this.emit('click', event);
    }
    
    handleMouseDown(event) {
        this.setState({ pressed: true });
    }
    
    handleMouseUp(event) {
        this.setState({ pressed: false });
    }
    
    handleMouseLeave(event) {
        this.setState({ pressed: false });
        
        if (this.onMouseLeave) {
            this.onMouseLeave(event);
        }
    }
    
    handleMouseEnter(event) {
        if (this.onMouseEnter) {
            this.onMouseEnter(event);
        }
    }
    
    handleFocus(event) {
        if (this.onFocus) {
            this.onFocus(event);
        }
        
        this.emit('focus', event);
    }
    
    handleBlur(event) {
        this.setState({ pressed: false });
        
        if (this.onBlur) {
            this.onBlur(event);
        }
        
        this.emit('blur', event);
    }
    
    handleKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            if (!this.state.disabled && !this.disabled && !this.state.loading) {
                this.setState({ pressed: true });
                
                // Release pressed state after a short delay
                setTimeout(() => {
                    this.setState({ pressed: false });
                }, 150);
            }
        }
    }
    
    createRipple(event) {
        const button = this.container.querySelector('.enhanced-btn');
        const ripple = this.container.querySelector('.btn-ripple');
        
        if (!button || !ripple) return;
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        // Create ripple element
        const rippleElement = document.createElement('span');
        rippleElement.className = 'btn-ripple-effect';
        rippleElement.style.width = rippleElement.style.height = size + 'px';
        rippleElement.style.left = x + 'px';
        rippleElement.style.top = y + 'px';
        
        // Clear previous ripples
        ripple.innerHTML = '';
        ripple.appendChild(rippleElement);
        
        // Remove ripple after animation
        setTimeout(() => {
            if (rippleElement.parentNode) {
                rippleElement.parentNode.removeChild(rippleElement);
            }
        }, 600);
    }
    
    showSuccessState() {
        const originalText = this.text;
        const originalLeftIcon = this.leftIcon;
        
        // Temporarily show success state
        this.text = 'Success!';
        this.leftIcon = 'check';
        this.render();
        
        // Revert after 2 seconds
        setTimeout(() => {
            this.text = originalText;
            this.leftIcon = originalLeftIcon;
            this.render();
            this.bindEvents();
        }, 2000);
    }
    
    setLoading(loading) {
        this.setState({ loading });
    }
    
    setDisabled(disabled) {
        this.setState({ disabled });
    }
    
    setText(text) {
        this.text = text;
        this.render();
        this.bindEvents();
    }
    
    setIcon(position, icon) {
        if (position === 'left') {
            this.leftIcon = icon;
        } else if (position === 'right') {
            this.rightIcon = icon;
        }
        this.render();
        this.bindEvents();
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
        this.bindEvents();
    }
    
    destroy() {
        const button = this.container.querySelector('.enhanced-btn');
        if (button) {
            button.removeEventListener('click', this.handleClick);
            button.removeEventListener('mousedown', this.handleMouseDown);
            button.removeEventListener('mouseup', this.handleMouseUp);
            button.removeEventListener('mouseleave', this.handleMouseLeave);
            button.removeEventListener('mouseenter', this.handleMouseEnter);
            button.removeEventListener('focus', this.handleFocus);
            button.removeEventListener('blur', this.handleBlur);
            button.removeEventListener('keydown', this.handleKeyDown);
        }
        
        super.destroy();
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, (m) => map[m]);
    }
}