/**
 * Swipeable Card Component
 * Mobile-optimized card with swipe actions and gestures
 */

import { Component } from '../base/Component.js';
import { TouchMixin } from '../../utils/TouchManager.js';
import { eventBus } from '../../utils/events.js';

export class SwipeableCard extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            isSwipeActive: false,
            swipeDirection: null,
            swipeProgress: 0,
            isDragging: false,
            startX: 0,
            currentX: 0,
            threshold: 0.3, // 30% of card width
            snapThreshold: 0.15, // 15% to trigger snap back
            actions: [],
            isAnimating: false,
            isRevealed: false,
            revealedSide: null // 'left' or 'right'
        };
        
        this.cardData = options.cardData || {};
        this.swipeThreshold = options.swipeThreshold || 80;
        this.enableLeftSwipe = options.enableLeftSwipe !== false;
        this.enableRightSwipe = options.enableRightSwipe !== false;
        this.autoClose = options.autoClose !== false;
        this.hapticFeedback = options.hapticFeedback !== false;
        
        // Default swipe actions
        this.leftActions = options.leftActions || [
            {
                id: 'archive',
                icon: 'archive',
                label: 'Archive',
                color: '#6b7280',
                action: 'archive'
            }
        ];
        
        this.rightActions = options.rightActions || [
            {
                id: 'delete',
                icon: 'trash',
                label: 'Delete',
                color: '#ef4444',
                action: 'delete'
            },
            {
                id: 'edit',
                icon: 'edit',
                label: 'Edit',
                color: '#3b82f6',
                action: 'edit'
            }
        ];
        
        this.maxSwipeDistance = Math.max(
            this.leftActions.length * 80,
            this.rightActions.length * 80
        );
        
        // Touch handling
        this.touchStartX = 0;
        this.touchCurrentX = 0;
        this.velocity = 0;
        this.lastTouchTime = 0;
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.setupTouch();
        this.setupAccessibility();
    }
    
    setupTouch() {
        // Mixin touch capabilities
        Object.assign(this, TouchMixin);
        TouchMixin.setupTouch.call(this);
        
        // Custom touch handlers
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Mouse support for desktop testing
        this.container.addEventListener('mousedown', this.handleMouseStart.bind(this));
        this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.container.addEventListener('mouseup', this.handleMouseEnd.bind(this));
        this.container.addEventListener('mouseleave', this.handleMouseEnd.bind(this));
    }
    
    setupAccessibility() {
        // Setup screen reader announcements
        this.container.setAttribute('role', 'article');
        this.container.setAttribute('tabindex', '0');
        
        // Keyboard support
        this.container.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Focus management
        this.container.addEventListener('focus', this.handleFocus.bind(this));
        this.container.addEventListener('blur', this.handleBlur.bind(this));
    }
    
    render() {
        const { swipeProgress, swipeDirection, isRevealed, revealedSide } = this.state;
        
        this.container.innerHTML = `
            <div class="swipeable-card ${isRevealed ? 'swipeable-card--revealed' : ''}" 
                 data-card-id="${this.cardData.id}"
                 style="--swipe-progress: ${swipeProgress}">
                
                <!-- Left Action Panel -->
                <div class="swipe-actions swipe-actions--left ${swipeDirection === 'right' ? 'swipe-actions--visible' : ''}"
                     data-side="left">
                    ${this.renderActions(this.leftActions)}
                </div>
                
                <!-- Card Content -->
                <div class="swipeable-card-content" data-swipe-content>
                    ${this.renderCardContent()}
                    
                    <!-- Swipe Indicator -->
                    <div class="swipe-indicator ${swipeProgress > 0 ? 'swipe-indicator--visible' : ''}"
                         style="--indicator-progress: ${Math.abs(swipeProgress)}">
                        <div class="swipe-indicator-track">
                            <div class="swipe-indicator-progress"></div>
                        </div>
                        <div class="swipe-indicator-icon">
                            ${swipeDirection === 'right' ? this.getActionIcon(this.leftActions[0]?.icon) : ''}
                            ${swipeDirection === 'left' ? this.getActionIcon(this.rightActions[0]?.icon) : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Right Action Panel -->
                <div class="swipe-actions swipe-actions--right ${swipeDirection === 'left' ? 'swipe-actions--visible' : ''}"
                     data-side="right">
                    ${this.renderActions(this.rightActions)}
                </div>
                
                <!-- Touch Feedback -->
                <div class="swipe-feedback" data-swipe-feedback></div>
            </div>
        `;
        
        this.cacheElements();
        this.updateSwipeTransform();
    }
    
    renderCardContent() {
        // Override this method in subclasses or pass content via options
        return this.options.content || `
            <div class="card-header">
                <h3 class="card-title">${this.escapeHtml(this.cardData.title || 'Card Title')}</h3>
                ${this.cardData.subtitle ? `
                    <p class="card-subtitle">${this.escapeHtml(this.cardData.subtitle)}</p>
                ` : ''}
            </div>
            
            ${this.cardData.description ? `
                <div class="card-body">
                    <p class="card-description">${this.escapeHtml(this.cardData.description)}</p>
                </div>
            ` : ''}
            
            <div class="card-footer">
                <div class="card-meta">
                    ${this.cardData.date ? `
                        <span class="card-date">${this.formatDate(this.cardData.date)}</span>
                    ` : ''}
                    ${this.cardData.author ? `
                        <span class="card-author">${this.escapeHtml(this.cardData.author)}</span>
                    ` : ''}
                </div>
                
                ${this.cardData.tags && this.cardData.tags.length > 0 ? `
                    <div class="card-tags">
                        ${this.cardData.tags.map(tag => `
                            <span class="card-tag">${this.escapeHtml(tag)}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderActions(actions) {
        return actions.map((action, index) => `
            <button type="button" 
                    class="swipe-action" 
                    data-action="${action.action}"
                    data-action-id="${action.id}"
                    style="--action-color: ${action.color}; --action-index: ${index}"
                    aria-label="${action.label}">
                <div class="swipe-action-icon">
                    ${this.getActionIcon(action.icon)}
                </div>
                <span class="swipe-action-label">${this.escapeHtml(action.label)}</span>
            </button>
        `).join('');
    }
    
    getActionIcon(iconName) {
        const icons = {
            delete: '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>',
            edit: '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
            archive: '<polyline points="21,8 21,21 3,21 3,8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line>',
            share: '<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"></path><polyline points="16,6 12,2 8,6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>',
            favorite: '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>',
            more: '<circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle>'
        };
        
        const iconPath = icons[iconName] || icons.more;
        
        return `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${iconPath}
            </svg>
        `;
    }
    
    cacheElements() {
        this.cardElement = this.container.querySelector('.swipeable-card');
        this.contentElement = this.container.querySelector('[data-swipe-content]');
        this.leftActionsElement = this.container.querySelector('[data-side="left"]');
        this.rightActionsElement = this.container.querySelector('[data-side="right"]');
        this.feedbackElement = this.container.querySelector('[data-swipe-feedback]');
    }
    
    handleTouchStart(e) {
        if (this.state.isAnimating) return;
        
        this.state.isDragging = true;
        this.state.startX = e.touches[0].clientX;
        this.touchStartX = e.touches[0].clientX;
        this.touchCurrentX = e.touches[0].clientX;
        this.lastTouchTime = Date.now();
        
        // Cancel any ongoing animations
        if (this.contentElement) {
            this.contentElement.style.transition = 'none';
        }
        
        this.setState({ isSwipeActive: true });
        this.addTouchClass();
    }
    
    handleTouchMove(e) {
        if (!this.state.isDragging) return;
        
        e.preventDefault();
        
        this.touchCurrentX = e.touches[0].clientX;
        const deltaX = this.touchCurrentX - this.touchStartX;
        const containerWidth = this.container.offsetWidth;
        
        // Calculate velocity
        const now = Date.now();
        const timeDelta = now - this.lastTouchTime;
        if (timeDelta > 0) {
            this.velocity = (this.touchCurrentX - this.state.currentX) / timeDelta;
        }
        this.lastTouchTime = now;
        
        // Determine swipe direction and constraints
        let constrainedDelta = deltaX;
        let direction = deltaX > 0 ? 'right' : 'left';
        
        // Check if swipe direction is enabled
        if ((direction === 'left' && !this.enableLeftSwipe) ||
            (direction === 'right' && !this.enableRightSwipe)) {
            constrainedDelta = 0;
        } else {
            // Apply resistance at the edges
            const maxDistance = this.maxSwipeDistance;
            const resistance = 0.3;
            
            if (Math.abs(constrainedDelta) > maxDistance) {
                const excess = Math.abs(constrainedDelta) - maxDistance;
                constrainedDelta = Math.sign(constrainedDelta) * (maxDistance + excess * resistance);
            }
        }
        
        // Update state
        this.setState({
            currentX: constrainedDelta,
            swipeDirection: constrainedDelta === 0 ? null : direction,
            swipeProgress: Math.abs(constrainedDelta) / containerWidth
        });
        
        this.updateSwipeTransform();
        this.updateSwipeIndicator();
        
        // Haptic feedback at threshold
        if (this.hapticFeedback && Math.abs(constrainedDelta) > this.swipeThreshold && 
            Math.abs(this.state.currentX) <= this.swipeThreshold) {
            this.triggerHapticFeedback();
        }
    }
    
    handleTouchEnd(e) {
        if (!this.state.isDragging) return;
        
        this.state.isDragging = false;
        const deltaX = this.state.currentX;
        const containerWidth = this.container.offsetWidth;
        const swipeProgress = Math.abs(deltaX) / containerWidth;
        
        // Determine if swipe should complete
        const shouldComplete = this.shouldCompleteSwipe(deltaX, swipeProgress);
        
        if (shouldComplete) {
            this.completeSwipe();
        } else {
            this.resetSwipe();
        }
        
        this.removeTouchClass();
    }
    
    // Mouse support for desktop testing
    handleMouseStart(e) {
        if (e.button !== 0) return; // Only left mouse button
        this.handleTouchStart({
            touches: [{ clientX: e.clientX }]
        });
    }
    
    handleMouseMove(e) {
        if (!this.state.isDragging) return;
        this.handleTouchMove({
            touches: [{ clientX: e.clientX }],
            preventDefault: () => {}
        });
    }
    
    handleMouseEnd(e) {
        this.handleTouchEnd(e);
    }
    
    shouldCompleteSwipe(deltaX, swipeProgress) {
        const threshold = this.state.threshold;
        const velocity = Math.abs(this.velocity);
        
        // Complete if past threshold or high velocity
        return swipeProgress > threshold || (velocity > 0.5 && Math.abs(deltaX) > 30);
    }
    
    completeSwipe() {
        const direction = this.state.swipeDirection;
        const actions = direction === 'left' ? this.rightActions : this.leftActions;
        
        if (actions.length > 0) {
            this.setState({ 
                isAnimating: true,
                isRevealed: true,
                revealedSide: direction === 'left' ? 'right' : 'left'
            });
            
            this.animateToPosition(direction === 'left' ? -this.maxSwipeDistance : this.maxSwipeDistance);
            
            // Auto-execute single action or show action panel
            if (actions.length === 1 && this.autoClose) {
                setTimeout(() => {
                    this.executeAction(actions[0]);
                }, 200);
            } else {
                this.showActionPanel(direction);
            }
        } else {
            this.resetSwipe();
        }
    }
    
    resetSwipe() {
        this.setState({ 
            isAnimating: true,
            isRevealed: false,
            revealedSide: null
        });
        
        this.animateToPosition(0);
        
        setTimeout(() => {
            this.setState({ 
                isSwipeActive: false,
                swipeDirection: null,
                swipeProgress: 0,
                currentX: 0,
                isAnimating: false
            });
        }, 300);
    }
    
    animateToPosition(targetX) {
        if (this.contentElement) {
            this.contentElement.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            this.contentElement.style.transform = `translateX(${targetX}px)`;
        }
        
        // Update action panels
        this.updateActionPanels(targetX);
        
        setTimeout(() => {
            if (this.contentElement) {
                this.contentElement.style.transition = '';
            }
            this.setState({ isAnimating: false });
        }, 300);
    }
    
    updateSwipeTransform() {
        if (this.contentElement) {
            this.contentElement.style.transform = `translateX(${this.state.currentX}px)`;
        }
        
        this.updateActionPanels(this.state.currentX);
    }
    
    updateActionPanels(deltaX) {
        const absX = Math.abs(deltaX);
        const maxDistance = this.maxSwipeDistance;
        const progress = Math.min(absX / maxDistance, 1);
        
        if (deltaX > 0 && this.leftActionsElement) {
            // Showing left actions (swiping right)
            this.leftActionsElement.style.transform = `translateX(${Math.min(deltaX - this.leftActionsElement.offsetWidth, 0)}px)`;
            this.leftActionsElement.style.opacity = progress;
        } else if (deltaX < 0 && this.rightActionsElement) {
            // Showing right actions (swiping left)
            this.rightActionsElement.style.transform = `translateX(${Math.max(deltaX + this.rightActionsElement.offsetWidth, 0)}px)`;
            this.rightActionsElement.style.opacity = progress;
        }
    }
    
    updateSwipeIndicator() {
        // Visual feedback for swipe progress
        const progress = this.state.swipeProgress;
        const indicator = this.container.querySelector('.swipe-indicator');
        
        if (indicator) {
            indicator.style.opacity = Math.min(progress * 2, 1);
        }
    }
    
    showActionPanel(direction) {
        this.setState({ isRevealed: true, revealedSide: direction === 'left' ? 'right' : 'left' });
        
        // Auto-close after delay if enabled
        if (this.autoClose) {
            setTimeout(() => {
                this.closeActionPanel();
            }, 3000);
        }
        
        this.announceToScreenReader(`Swipe actions revealed. ${direction === 'left' ? this.rightActions.length : this.leftActions.length} actions available.`);
    }
    
    closeActionPanel() {
        this.resetSwipe();
    }
    
    executeAction(action) {
        this.setState({ isAnimating: true });
        
        // Trigger haptic feedback
        if (this.hapticFeedback) {
            this.triggerHapticFeedback();
        }
        
        // Emit action event
        this.emit('action', {
            action: action.action,
            actionId: action.id,
            cardData: this.cardData
        });
        
        // Visual feedback
        this.addActionFeedback(action);
        
        // Reset after animation
        setTimeout(() => {
            this.resetSwipe();
        }, 150);
    }
    
    addActionFeedback(action) {
        if (this.feedbackElement) {
            this.feedbackElement.style.backgroundColor = action.color;
            this.feedbackElement.classList.add('swipe-feedback--active');
            
            setTimeout(() => {
                this.feedbackElement.classList.remove('swipe-feedback--active');
            }, 300);
        }
    }
    
    addTouchClass() {
        this.cardElement?.classList.add('swipeable-card--touching');
    }
    
    removeTouchClass() {
        this.cardElement?.classList.remove('swipeable-card--touching');
    }
    
    triggerHapticFeedback() {
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }
    
    // Keyboard support
    handleKeydown(e) {
        if (this.state.isRevealed) {
            if (e.key === 'Escape') {
                this.closeActionPanel();
            } else if (e.key >= '1' && e.key <= '9') {
                const actionIndex = parseInt(e.key) - 1;
                const actions = this.state.revealedSide === 'left' ? this.leftActions : this.rightActions;
                if (actions[actionIndex]) {
                    this.executeAction(actions[actionIndex]);
                }
            }
        } else {
            if (e.key === 'ArrowLeft' && this.enableLeftSwipe) {
                this.setState({ currentX: -this.swipeThreshold - 1 });
                this.completeSwipe();
            } else if (e.key === 'ArrowRight' && this.enableRightSwipe) {
                this.setState({ currentX: this.swipeThreshold + 1 });
                this.completeSwipe();
            }
        }
    }
    
    handleFocus() {
        this.container.classList.add('swipeable-card--focused');
    }
    
    handleBlur() {
        this.container.classList.remove('swipeable-card--focused');
        if (this.state.isRevealed && this.autoClose) {
            this.closeActionPanel();
        }
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
    }
    
    handleClick(e) {
        const actionElement = e.target.closest('[data-action]');
        if (actionElement) {
            e.preventDefault();
            e.stopPropagation();
            
            const actionId = actionElement.dataset.actionId;
            const actionName = actionElement.dataset.action;
            
            // Find the action object
            const allActions = [...this.leftActions, ...this.rightActions];
            const action = allActions.find(a => a.id === actionId);
            
            if (action) {
                this.executeAction(action);
            }
        } else if (!this.state.isRevealed) {
            // Card tap - emit tap event
            this.emit('tap', {
                cardData: this.cardData,
                originalEvent: e
            });
        }
    }
    
    // Touch gesture handlers from TouchMixin
    handleSwipe(data) {
        if (data.direction === 'left' || data.direction === 'right') {
            const direction = data.direction;
            const distance = Math.abs(data.deltaX);
            
            if (distance > this.swipeThreshold) {
                this.setState({
                    swipeDirection: direction,
                    currentX: direction === 'left' ? -distance : distance
                });
                
                this.completeSwipe();
            }
        }
    }
    
    handleLongPress(data) {
        // Show context menu or additional options
        this.emit('longpress', {
            cardData: this.cardData,
            x: data.x,
            y: data.y,
            originalEvent: data.originalEvent
        });
    }
    
    handleDoubleTap(data) {
        // Quick action or edit mode
        this.emit('doubletap', {
            cardData: this.cardData,
            originalEvent: data.originalEvent
        });
    }
    
    // Event system
    emit(event, data) {
        eventBus.emit(`swipeable-card:${event}`, data);
        
        // Call option handlers
        const handler = this.options[`on${event.charAt(0).toUpperCase() + event.slice(1)}`];
        if (typeof handler === 'function') {
            handler(data);
        }
    }
    
    // Utility methods
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    // Public API
    setCardData(cardData) {
        this.cardData = { ...this.cardData, ...cardData };
        this.render();
    }
    
    getCardData() {
        return { ...this.cardData };
    }
    
    setActions(leftActions, rightActions) {
        if (leftActions) this.leftActions = leftActions;
        if (rightActions) this.rightActions = rightActions;
        this.render();
    }
    
    isRevealed() {
        return this.state.isRevealed;
    }
    
    close() {
        if (this.state.isRevealed) {
            this.closeActionPanel();
        }
    }
    
    destroy() {
        // Clean up touch handling
        if (this.destroyTouch) {
            this.destroyTouch();
        }
        
        // Remove event listeners
        this.container.removeEventListener('touchstart', this.handleTouchStart);
        this.container.removeEventListener('touchmove', this.handleTouchMove);
        this.container.removeEventListener('touchend', this.handleTouchEnd);
        this.container.removeEventListener('mousedown', this.handleMouseStart);
        this.container.removeEventListener('mousemove', this.handleMouseMove);
        this.container.removeEventListener('mouseup', this.handleMouseEnd);
        this.container.removeEventListener('mouseleave', this.handleMouseEnd);
        this.container.removeEventListener('keydown', this.handleKeydown);
        this.container.removeEventListener('focus', this.handleFocus);
        this.container.removeEventListener('blur', this.handleBlur);
        this.container.removeEventListener('click', this.handleClick);
        
        super.destroy();
    }
} 