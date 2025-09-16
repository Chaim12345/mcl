/**
 * Touch Manager Utility
 * Handles touch gestures, interactions, and mobile-specific behaviors
 */

export class TouchManager {
    constructor(options = {}) {
        this.options = {
            // Touch detection settings
            touchThreshold: 10,
            swipeThreshold: 50,
            longPressDelay: 500,
            doubleTapDelay: 300,
            
            // Gesture settings
            enableSwipe: true,
            enablePinch: true,
            enableLongPress: true,
            enableDoubleTap: true,
            
            // Performance settings
            throttleDelay: 16, // ~60fps
            
            // Accessibility
            reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            
            ...options
        };
        
        this.touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.pointerSupport = 'PointerEvent' in window;
        
        // Touch state tracking
        this.touches = new Map();
        this.gestureState = {
            isTracking: false,
            startTime: 0,
            startDistance: 0,
            lastDistance: 0,
            startAngle: 0,
            lastAngle: 0,
            center: { x: 0, y: 0 },
            scale: 1,
            rotation: 0,
            velocity: { x: 0, y: 0 },
            direction: null
        };
        
        // Event handlers
        this.handlers = new Map();
        this.throttledHandlers = new Map();
        
        // Timers
        this.longPressTimer = null;
        this.doubleTapTimer = null;
        this.lastTapTime = 0;
        this.lastTapTarget = null;
        
        this.init();
    }
    
    init() {
        this.detectCapabilities();
        this.setupEventListeners();
        this.setupAccessibility();
    }
    
    detectCapabilities() {
        // Detect device capabilities
        this.capabilities = {
            touch: this.touchSupport,
            pointer: this.pointerSupport,
            hover: window.matchMedia('(hover: hover)').matches,
            maxTouchPoints: navigator.maxTouchPoints || 1,
            hasHardwareKeyboard: window.matchMedia('(pointer: fine)').matches
        };
        
        // Add capability classes to document
        document.documentElement.classList.toggle('touch-device', this.capabilities.touch);
        document.documentElement.classList.toggle('pointer-device', this.capabilities.pointer);
        document.documentElement.classList.toggle('hover-device', this.capabilities.hover);
        document.documentElement.classList.toggle('no-hover-device', !this.capabilities.hover);
    }
    
    setupEventListeners() {
        // Use pointer events if available, fallback to touch events
        if (this.pointerSupport) {
            this.setupPointerEvents();
        } else if (this.touchSupport) {
            this.setupTouchEvents();
        }
        
        // Setup mouse events for fallback
        this.setupMouseEvents();
        
        // Orientation and resize handling
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        window.addEventListener('resize', this.throttle(this.handleResize.bind(this), 100));
        
        // Prevent default behaviors
        this.preventDefaultBehaviors();
    }
    
    setupPointerEvents() {
        const events = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
        
        events.forEach(event => {
            document.addEventListener(event, this.handlePointerEvent.bind(this), {
                passive: false,
                capture: true
            });
        });
    }
    
    setupTouchEvents() {
        const events = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
        
        events.forEach(event => {
            document.addEventListener(event, this.handleTouchEvent.bind(this), {
                passive: false,
                capture: true
            });
        });
    }
    
    setupMouseEvents() {
        // Mouse events for desktop fallback
        document.addEventListener('mousedown', this.handleMouseEvent.bind(this), { capture: true });
        document.addEventListener('mousemove', this.handleMouseEvent.bind(this), { capture: true });
        document.addEventListener('mouseup', this.handleMouseEvent.bind(this), { capture: true });
        document.addEventListener('click', this.handleClickEvent.bind(this), { capture: true });
    }
    
    setupAccessibility() {
        // Handle reduced motion preference
        const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        motionMediaQuery.addListener((e) => {
            this.options.reduceMotion = e.matches;
        });
    }
    
    preventDefaultBehaviors() {
        // Prevent pull-to-refresh on mobile
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) return;
            
            const touch = e.touches[0];
            const element = e.target;
            
            // Prevent pull-to-refresh at the top of the page
            if (touch.clientY > 50 && window.pageYOffset === 0) {
                const scrollableParent = this.findScrollableParent(element);
                if (!scrollableParent || scrollableParent.scrollTop <= 0) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
        
        // Prevent zoom on double tap for specific elements
        document.addEventListener('touchend', (e) => {
            const element = e.target.closest('[data-no-zoom]');
            if (element) {
                e.preventDefault();
            }
        });
        
        // Prevent context menu on long press for touch devices
        document.addEventListener('contextmenu', (e) => {
            if (this.touchSupport && e.target.closest('[data-no-context-menu]')) {
                e.preventDefault();
            }
        });
    }
    
    handlePointerEvent(e) {
        // Convert pointer event to unified touch format
        const touch = this.pointerToTouch(e);
        
        switch (e.type) {
            case 'pointerdown':
                this.handleTouchStart([touch], e);
                break;
            case 'pointermove':
                this.handleTouchMove([touch], e);
                break;
            case 'pointerup':
            case 'pointercancel':
                this.handleTouchEnd([touch], e);
                break;
        }
    }
    
    handleTouchEvent(e) {
        const touches = Array.from(e.touches || e.changedTouches);
        
        switch (e.type) {
            case 'touchstart':
                this.handleTouchStart(touches, e);
                break;
            case 'touchmove':
                this.handleTouchMove(touches, e);
                break;
            case 'touchend':
            case 'touchcancel':
                this.handleTouchEnd(touches, e);
                break;
        }
    }
    
    handleMouseEvent(e) {
        // Convert mouse event to touch format for consistency
        if (!this.touchSupport) {
            const touch = this.mouseToTouch(e);
            
            switch (e.type) {
                case 'mousedown':
                    this.handleTouchStart([touch], e);
                    break;
                case 'mousemove':
                    if (e.buttons > 0) {
                        this.handleTouchMove([touch], e);
                    }
                    break;
                case 'mouseup':
                    this.handleTouchEnd([touch], e);
                    break;
            }
        }
    }
    
    handleClickEvent(e) {
        // Enhanced click handling for touch devices
        const now = Date.now();
        const element = e.target;
        
        // Handle double tap
        if (this.options.enableDoubleTap) {
            if (now - this.lastTapTime < this.options.doubleTapDelay && 
                element === this.lastTapTarget) {
                this.emit('doubletap', {
                    originalEvent: e,
                    target: element,
                    x: e.clientX,
                    y: e.clientY
                });
                
                clearTimeout(this.doubleTapTimer);
                this.lastTapTime = 0;
                this.lastTapTarget = null;
                return;
            }
            
            this.lastTapTime = now;
            this.lastTapTarget = element;
            
            // Delay single tap to wait for potential double tap
            clearTimeout(this.doubleTapTimer);
            this.doubleTapTimer = setTimeout(() => {
                this.emit('singletap', {
                    originalEvent: e,
                    target: element,
                    x: e.clientX,
                    y: e.clientY
                });
            }, this.options.doubleTapDelay);
        }
        
        // Add visual feedback for touch devices
        if (this.touchSupport) {
            this.addTouchFeedback(element);
        }
    }
    
    handleTouchStart(touches, originalEvent) {
        const now = Date.now();
        
        // Store touch information
        touches.forEach(touch => {
            this.touches.set(touch.identifier || 'mouse', {
                id: touch.identifier || 'mouse',
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: now,
                element: originalEvent.target
            });
        });
        
        // Initialize gesture state
        if (touches.length === 1) {
            this.gestureState.isTracking = true;
            this.gestureState.startTime = now;
            
            // Setup long press detection
            if (this.options.enableLongPress) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = setTimeout(() => {
                    this.handleLongPress(touches[0], originalEvent);
                }, this.options.longPressDelay);
            }
        } else if (touches.length === 2) {
            // Multi-touch gesture setup
            this.setupMultiTouchGesture(touches);
        }
        
        this.emit('touchstart', {
            touches: Array.from(this.touches.values()),
            originalEvent,
            target: originalEvent.target
        });
    }
    
    handleTouchMove(touches, originalEvent) {
        if (!this.gestureState.isTracking) return;
        
        const now = Date.now();
        
        // Update touch positions
        touches.forEach(touch => {
            const storedTouch = this.touches.get(touch.identifier || 'mouse');
            if (storedTouch) {
                storedTouch.currentX = touch.clientX;
                storedTouch.currentY = touch.clientY;
                
                // Calculate velocity
                const deltaTime = now - storedTouch.lastMoveTime || now - storedTouch.startTime;
                const deltaX = touch.clientX - (storedTouch.lastX || storedTouch.startX);
                const deltaY = touch.clientY - (storedTouch.lastY || storedTouch.startY);
                
                if (deltaTime > 0) {
                    this.gestureState.velocity.x = deltaX / deltaTime;
                    this.gestureState.velocity.y = deltaY / deltaTime;
                }
                
                storedTouch.lastX = touch.clientX;
                storedTouch.lastY = touch.clientY;
                storedTouch.lastMoveTime = now;
            }
        });
        
        // Cancel long press if touch moves too much
        if (touches.length === 1) {
            const touch = this.touches.get(touches[0].identifier || 'mouse');
            if (touch) {
                const distance = this.getDistance(
                    touch.startX, touch.startY,
                    touch.currentX, touch.currentY
                );
                
                if (distance > this.options.touchThreshold) {
                    clearTimeout(this.longPressTimer);
                    
                    // Detect swipe gesture
                    if (this.options.enableSwipe && distance > this.options.swipeThreshold) {
                        this.handleSwipeGesture(touch, originalEvent);
                    }
                }
            }
        } else if (touches.length === 2) {
            // Handle multi-touch gestures
            this.handleMultiTouchGesture(touches, originalEvent);
        }
        
        this.emit('touchmove', {
            touches: Array.from(this.touches.values()),
            originalEvent,
            target: originalEvent.target,
            velocity: this.gestureState.velocity
        });
    }
    
    handleTouchEnd(touches, originalEvent) {
        const now = Date.now();
        
        // Remove ended touches
        touches.forEach(touch => {
            this.touches.delete(touch.identifier || 'mouse');
        });
        
        // Clear timers
        clearTimeout(this.longPressTimer);
        
        // Handle swipe completion
        if (this.gestureState.isTracking && touches.length === 1) {
            const touch = touches[0];
            const storedTouch = this.touches.get(touch.identifier || 'mouse');
            
            if (storedTouch) {
                this.completeSwipeGesture(storedTouch, originalEvent);
            }
        }
        
        // Reset gesture state if no touches remain
        if (this.touches.size === 0) {
            this.gestureState.isTracking = false;
            this.gestureState.scale = 1;
            this.gestureState.rotation = 0;
        }
        
        this.emit('touchend', {
            touches: Array.from(this.touches.values()),
            originalEvent,
            target: originalEvent.target
        });
    }
    
    handleLongPress(touch, originalEvent) {
        this.emit('longpress', {
            originalEvent,
            target: originalEvent.target,
            x: touch.clientX,
            y: touch.clientY,
            duration: Date.now() - this.gestureState.startTime
        });
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    handleSwipeGesture(touch, originalEvent) {
        const deltaX = touch.currentX - touch.startX;
        const deltaY = touch.currentY - touch.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        
        // Determine swipe direction
        let direction;
        if (Math.abs(angle) < 45) {
            direction = 'right';
        } else if (Math.abs(angle) > 135) {
            direction = 'left';
        } else if (angle < 0) {
            direction = 'up';
        } else {
            direction = 'down';
        }
        
        this.gestureState.direction = direction;
        
        this.emit('swipe', {
            originalEvent,
            target: originalEvent.target,
            direction,
            distance,
            angle,
            deltaX,
            deltaY,
            velocity: this.gestureState.velocity
        });
    }
    
    completeSwipeGesture(touch, originalEvent) {
        if (!this.gestureState.direction) return;
        
        const deltaX = touch.currentX - touch.startX;
        const deltaY = touch.currentY - touch.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = Date.now() - touch.startTime;
        
        this.emit('swipecomplete', {
            originalEvent,
            target: originalEvent.target,
            direction: this.gestureState.direction,
            distance,
            duration,
            velocity: this.gestureState.velocity
        });
    }
    
    setupMultiTouchGesture(touches) {
        if (touches.length !== 2) return;
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        this.gestureState.startDistance = this.getDistance(
            touch1.clientX, touch1.clientY,
            touch2.clientX, touch2.clientY
        );
        
        this.gestureState.startAngle = this.getAngle(
            touch1.clientX, touch1.clientY,
            touch2.clientX, touch2.clientY
        );
        
        this.gestureState.center = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }
    
    handleMultiTouchGesture(touches, originalEvent) {
        if (touches.length !== 2) return;
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        const currentDistance = this.getDistance(
            touch1.clientX, touch1.clientY,
            touch2.clientX, touch2.clientY
        );
        
        const currentAngle = this.getAngle(
            touch1.clientX, touch1.clientY,
            touch2.clientX, touch2.clientY
        );
        
        // Calculate scale (pinch/zoom)
        if (this.options.enablePinch && this.gestureState.startDistance > 0) {
            const scale = currentDistance / this.gestureState.startDistance;
            this.gestureState.scale = scale;
            
            this.emit('pinch', {
                originalEvent,
                scale,
                center: this.gestureState.center,
                distance: currentDistance,
                velocity: this.gestureState.velocity
            });
        }
        
        // Calculate rotation
        const rotation = currentAngle - this.gestureState.startAngle;
        this.gestureState.rotation = rotation;
        
        this.emit('rotate', {
            originalEvent,
            rotation,
            center: this.gestureState.center,
            angle: currentAngle
        });
        
        // Combined transform event
        this.emit('transform', {
            originalEvent,
            scale: this.gestureState.scale,
            rotation: this.gestureState.rotation,
            center: this.gestureState.center
        });
    }
    
    handleOrientationChange() {
        // Reset gesture state on orientation change
        this.gestureState.isTracking = false;
        this.touches.clear();
        clearTimeout(this.longPressTimer);
        clearTimeout(this.doubleTapTimer);
        
        // Emit orientation change event
        setTimeout(() => {
            this.emit('orientationchange', {
                orientation: screen.orientation?.angle || window.orientation || 0,
                width: window.innerWidth,
                height: window.innerHeight
            });
        }, 100); // Delay to get accurate dimensions
    }
    
    handleResize() {
        this.emit('resize', {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: window.innerWidth < 768
        });
    }
    
    // Touch feedback utilities
    addTouchFeedback(element) {
        if (this.options.reduceMotion) return;
        
        element.classList.add('touch-active');
        
        // Remove feedback after animation
        setTimeout(() => {
            element.classList.remove('touch-active');
        }, 150);
        
        // Add ripple effect if enabled
        if (element.dataset.ripple !== 'false') {
            this.addRippleEffect(element);
        }
    }
    
    addRippleEffect(element) {
        const ripple = document.createElement('span');
        ripple.className = 'touch-ripple';
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = rect.width / 2 - size / 2;
        const y = rect.height / 2 - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        element.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }
    
    // Event system
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
    }
    
    off(event, handler) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).delete(handler);
        }
    }
    
    emit(event, data) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Touch event handler error:', error);
                }
            });
        }
    }
    
    // Utility methods
    getDistance(x1, y1, x2, y2) {
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
    
    getAngle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    }
    
    findScrollableParent(element) {
        while (element && element !== document.body) {
            const style = window.getComputedStyle(element);
            if (style.overflow === 'auto' || style.overflow === 'scroll' ||
                style.overflowY === 'auto' || style.overflowY === 'scroll') {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }
    
    pointerToTouch(pointerEvent) {
        return {
            identifier: pointerEvent.pointerId,
            clientX: pointerEvent.clientX,
            clientY: pointerEvent.clientY,
            pageX: pointerEvent.pageX,
            pageY: pointerEvent.pageY,
            target: pointerEvent.target
        };
    }
    
    mouseToTouch(mouseEvent) {
        return {
            identifier: 'mouse',
            clientX: mouseEvent.clientX,
            clientY: mouseEvent.clientY,
            pageX: mouseEvent.pageX,
            pageY: mouseEvent.pageY,
            target: mouseEvent.target
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Public API methods
    isTouch() {
        return this.touchSupport;
    }
    
    hasPointer() {
        return this.pointerSupport;
    }
    
    getCapabilities() {
        return { ...this.capabilities };
    }
    
    enableGesture(gesture) {
        this.options[`enable${gesture.charAt(0).toUpperCase() + gesture.slice(1)}`] = true;
    }
    
    disableGesture(gesture) {
        this.options[`enable${gesture.charAt(0).toUpperCase() + gesture.slice(1)}`] = false;
    }
    
    destroy() {
        // Clean up timers
        clearTimeout(this.longPressTimer);
        clearTimeout(this.doubleTapTimer);
        
        // Clear handlers
        this.handlers.clear();
        this.touches.clear();
        
        // Remove event listeners
        if (this.pointerSupport) {
            const events = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
            events.forEach(event => {
                document.removeEventListener(event, this.handlePointerEvent);
            });
        }
        
        if (this.touchSupport) {
            const events = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
            events.forEach(event => {
                document.removeEventListener(event, this.handleTouchEvent);
            });
        }
        
        document.removeEventListener('mousedown', this.handleMouseEvent);
        document.removeEventListener('mousemove', this.handleMouseEvent);
        document.removeEventListener('mouseup', this.handleMouseEvent);
        document.removeEventListener('click', this.handleClickEvent);
        
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        window.removeEventListener('resize', this.handleResize);
    }
}

// Touch-friendly component mixins
export const TouchMixin = {
    setupTouch() {
        if (!this.touchManager) {
            this.touchManager = new TouchManager();
        }
        
        // Setup touch event handlers
        this.touchManager.on('swipe', this.handleSwipe?.bind(this));
        this.touchManager.on('pinch', this.handlePinch?.bind(this));
        this.touchManager.on('longpress', this.handleLongPress?.bind(this));
        this.touchManager.on('doubletap', this.handleDoubleTap?.bind(this));
    },
    
    destroyTouch() {
        if (this.touchManager) {
            this.touchManager.destroy();
            this.touchManager = null;
        }
    }
};

// Global touch manager instance
export const globalTouchManager = new TouchManager(); 