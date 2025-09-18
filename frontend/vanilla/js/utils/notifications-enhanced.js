/**
 * Enhanced Notifications System - Compatibility Layer
 * Provides showNotification function for ItemDisplayEditor
 */

export function showNotification(message, type = 'info', options = {}) {
    console.log([] );
    
    // Create a simple notification element
    const notification = document.createElement('div');
    notification.className = 
otification notification-;
    notification.style.cssText = 
        position: fixed;
        top: 20px;
        right: 20px;
        background: ;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 300px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    ;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
    
    return Date.now().toString();
}

export function showSuccess(message, options = {}) {
    return showNotification(message, 'success', options);
}

export function showError(message, options = {}) {
    return showNotification(message, 'error', options);
}

export function showWarning(message, options = {}) {
    return showNotification(message, 'warning', options);
}

export function showInfo(message, options = {}) {
    return showNotification(message, 'info', options);
}
