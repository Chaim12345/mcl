/**
 * Authentication Service for Vanilla JavaScript Frontend
 */

import { eventBus } from '../utils/events.js';
import { state } from '../utils/state.js';

// Configuration constants
const API_BASE_URL = '/api';
const TOKEN_STORAGE_KEY = 'auth_token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const USER_STORAGE_KEY = 'user_data';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Authentication Service Class
 */
class AuthService {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        this.lastActivity = null;
        this.refreshTimer = null;
        this.sessionTimer = null;
        
        // Initialize from storage
        this.initializeFromStorage();
        
        // Set up activity tracking
        this.setupActivityTracking();
        
        // Set up token refresh
        this.setupTokenRefresh();
    }
    
    /**
     * Initialize authentication state from local storage
     */
    initializeFromStorage() {
        try {
            const token = localStorage.getItem(TOKEN_STORAGE_KEY);
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
            const userData = localStorage.getItem(USER_STORAGE_KEY);
            
            if (token && refreshToken && userData) {
                this.token = token;
                this.refreshToken = refreshToken;
                this.user = JSON.parse(userData);
                this.isAuthenticated = true;
                this.lastActivity = Date.now();
                
                // Validate token expiration
                if (this.isTokenExpired(token)) {
                    this.refreshTokens().catch(() => {
                        this.logout('expired');
                    });
                } else {
                    // Update global state
                    state.set('auth', {
                        isAuthenticated: true,
                        user: this.user,
                        token: this.token
                    });
                    
                    // Emit login event
                    eventBus.emit('auth:login', { user: this.user });
                }
            }
        } catch (error) {
            console.error('Error initializing auth from storage:', error);
            this.clearStorage();
        }
    }
    
    /**
     * Set up activity tracking for auto-logout
     */
    setupActivityTracking() {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const handleActivity = () => {
            if (this.isAuthenticated) {
                this.updateActivity();
            }
        };
        
        activityEvents.forEach(event => {
            document.addEventListener(event, handleActivity, true);
        });
    }
    
    /**
     * Set up automatic token refresh
     */
    setupTokenRefresh() {
        this.refreshTimer = setInterval(() => {
            if (this.isAuthenticated && this.token) {
                const timeUntilExpiry = this.getTokenTimeUntilExpiry(this.token);
                
                if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD && timeUntilExpiry > 0) {
                    this.refreshTokens().catch(() => {
                        this.logout('expired');
                    });
                } else if (timeUntilExpiry <= 0) {
                    this.logout('expired');
                }
            }
        }, 60000); // Check every minute
    }
    
    /**
     * Update last activity timestamp
     */
    updateActivity() {
        this.lastActivity = Date.now();
        
        // Reset session timeout
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        this.sessionTimer = setTimeout(() => {
            if (this.isAuthenticated) {
                this.logout('expired');
            }
        }, SESSION_TIMEOUT);
    }
    
    /**
     * Check if token is expired
     */
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000;
            return Date.now() >= expiry;
        } catch {
            return true;
        }
    }
    
    /**
     * Get time until token expiry
     */
    getTokenTimeUntilExpiry(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000;
            return expiry - Date.now();
        } catch {
            return 0;
        }
    }
    
    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { Authorization: `Bearer ${this.token}` }),
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (response.status === 401 && this.isAuthenticated) {
                // Try to refresh token
                const refreshed = await this.refreshTokens();
                if (refreshed) {
                    // Retry original request with new token
                    config.headers.Authorization = `Bearer ${this.token}`;
                    return await fetch(url, config);
                } else {
                    this.logout('expired');
                    throw new Error('Session expired');
                }
            }
            
            // Use the same response parsing as ApiClient to handle nested data
            return await this.parseResponse(response);
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * Parse API response
     */
    async parseResponse(response) {
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.message || 'An unknown error occurred');
        }

        try {
            const responseData = await response.json();
            if (responseData.success === false) {
                throw new Error(responseData.message || 'An API error occurred');
            }
            return responseData;
        } catch (error) {
            // This catches JSON parsing errors, which was the original problem
            console.error('Failed to parse API response:', error);
            throw new Error('Failed to parse API response.');
        }
    }
    
    /**
     * Login with credentials
     */
    async login(credentials) {
        try {
            const response = await this.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            
            if (response.success) {
                this.setAuthData(response.data.user, response.data.token, response.data.refreshToken);
                eventBus.emit('auth:login', { user: this.user });
                eventBus.emit('notification:success', { message: `Welcome back, ${this.user.firstName}!` });
                return response.data;
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Register new user
     */
    async register(userData) {
        try {
            const response = await this.makeRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            if (response.success) {
                eventBus.emit('notification:success', { 
                    message: 'Registration successful! Please check your email to verify your account.' 
                });
                return response.data;
            } else {
                throw new Error(response.message || 'Registration failed');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Request password reset
     */
    async forgotPassword(email) {
        try {
            const response = await this.makeRequest('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            
            if (response.success) {
                eventBus.emit('notification:success', { 
                    message: 'Password reset email sent. Please check your inbox.' 
                });
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to send reset email');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        try {
            const response = await this.makeRequest('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token, password: newPassword })
            });
            
            if (response.success) {
                eventBus.emit('notification:success', { 
                    message: 'Password reset successful! You can now sign in with your new password.' 
                });
                return response.data;
            } else {
                throw new Error(response.message || 'Password reset failed');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Verify email with token
     */
    async verifyEmail(token) {
        try {
            const response = await this.makeRequest('/auth/verify-email', {
                method: 'POST',
                body: JSON.stringify({ token })
            });
            
            if (response.success) {
                eventBus.emit('notification:success', { 
                    message: 'Email verified successfully! You can now sign in.' 
                });
                return response.data;
            } else {
                throw new Error(response.message || 'Email verification failed');
            }
        } catch (error) {
            eventBus.emit('notification:error', { message: error.message });
            throw error;
        }
    }
    
    /**
     * Refresh authentication tokens
     */
    async refreshTokens() {
        if (!this.refreshToken) {
            return false;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                this.refreshToken = data.refreshToken;
                this.updateActivity();
                
                // Update storage
                localStorage.setItem(TOKEN_STORAGE_KEY, this.token);
                localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, this.refreshToken);
                
                // Update global state
                state.set('auth', {
                    isAuthenticated: true,
                    user: this.user,
                    token: this.token
                });
                
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }
    
    /**
     * Set authentication data
     */
    setAuthData(user, token, refreshToken) {
        this.user = user;
        this.token = token;
        this.refreshToken = refreshToken;
        this.isAuthenticated = true;
        this.lastActivity = Date.now();
        
        // Store in localStorage
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        
        // Update global state
        state.set('auth', {
            isAuthenticated: true,
            user: this.user,
            token: this.token
        });
        
        // Start activity tracking
        this.updateActivity();
    }
    
    /**
     * Logout user
     */
    async logout(reason = 'manual') {
        try {
            // Notify server about logout
            if (this.token) {
                await this.makeRequest('/auth/logout', { method: 'POST' }).catch(() => {
                    // Ignore errors during logout
                });
            }
        } catch (error) {
            console.warn('Logout request failed:', error);
        }
        
        // Clear local state
        this.clearState();
        
        // Show appropriate message
        const messages = {
            manual: 'You have been logged out successfully.',
            expired: 'Your session has expired. Please sign in again.',
            error: 'Authentication error. Please sign in again.'
        };
        
        if (reason !== 'manual') {
            eventBus.emit('notification:warning', { message: messages[reason] });
        } else {
            eventBus.emit('notification:info', { message: messages[reason] });
        }
        
        // Emit logout event
        eventBus.emit('auth:logout', { reason });
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
            window.location.href = '/login.html';
        }
    }
    
    /**
     * Clear authentication state
     */
    clearState() {
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        this.isAuthenticated = false;
        this.lastActivity = null;
        
        // Clear timers
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        // Clear storage
        this.clearStorage();
        
        // Update global state
        state.set('auth', {
            isAuthenticated: false,
            user: null,
            token: null
        });
    }
    
    /**
     * Clear storage
     */
    clearStorage() {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
    }
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.user;
    }
    
    /**
     * Check if user is authenticated
     */
    isUserAuthenticated() {
        return this.isAuthenticated && this.token && !this.isTokenExpired(this.token);
    }
    
    /**
     * Get authentication token
     */
    getToken() {
        return this.token;
    }
    
    /**
     * Get user display name
     */
    getUserDisplayName() {
        if (!this.user) return '';
        return `${this.user.firstName} ${this.user.lastName}`.trim();
    }
    
    /**
     * Get user initials
     */
    getUserInitials() {
        if (!this.user) return '';
        return `${this.user.firstName?.[0] || ''}${this.user.lastName?.[0] || ''}`.toUpperCase();
    }
    
    /**
     * Check if session is expiring soon
     */
    isSessionExpiringSoon() {
        if (!this.lastActivity) return false;
        const timeRemaining = SESSION_TIMEOUT - (Date.now() - this.lastActivity);
        return timeRemaining > 0 && timeRemaining < 5 * 60 * 1000; // Less than 5 minutes
    }
    
    /**
     * Get session time remaining
     */
    getSessionTimeRemaining() {
        if (!this.lastActivity) return 0;
        return Math.max(0, SESSION_TIMEOUT - (Date.now() - this.lastActivity));
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
    }
}

// Create and export singleton instance
export const authService = new AuthService();

// Export the class for testing
export { AuthService }; 
