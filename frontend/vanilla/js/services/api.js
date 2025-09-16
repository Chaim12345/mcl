/**
 * API Client for Backend Communication
 * Enhanced for Go backend integration with proper authentication
 */

import { eventBus } from '../utils/events.js';

// Simple ApiError class
export class ApiError extends Error {
    constructor(message, status, details = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

/**
 * HTTP Client with interceptors and error handling
 */
class HttpClient {
    constructor(baseURL = '', options = {}) {
        this.baseURL = baseURL;
        this.defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            ...options
        };
        
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.retryConfig = {
            maxRetries: 3,
            retryDelay: 1000,
            retryCondition: (error) => {
                return error.status >= 500 || error.status === 0;
            }
        };
    }
    
    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
        return this;
    }
    
    /**
     * Add response interceptor
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
        return this;
    }
    
    /**
     * Configure retry behavior
     */
    configureRetry(config) {
        this.retryConfig = { ...this.retryConfig, ...config };
        return this;
    }
    
    /**
     * Process request through interceptors
     */
    async processRequest(url, options) {
        let processedOptions = { ...this.defaultOptions, ...options };
        
        for (const interceptor of this.requestInterceptors) {
            try {
                processedOptions = await interceptor(url, processedOptions);
            } catch (error) {
                console.error('Request interceptor error:', error);
            }
        }
        
        return processedOptions;
    }
    
    /**
     * Process response through interceptors
     */
    async processResponse(response, url, options) {
        let processedResponse = response;
        
        for (const interceptor of this.responseInterceptors) {
            try {
                processedResponse = await interceptor(processedResponse, url, options);
            } catch (error) {
                console.error('Response interceptor error:', error);
            }
        }
        
        return processedResponse;
    }
    
    /**
     * Make HTTP request with retry logic
     */
    async request(url, options = {}, retryCount = 0) {
        const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        const processedOptions = await this.processRequest(fullUrl, options);

        try {
            const response = await fetch(fullUrl, processedOptions);
            const processedResponse = await this.processResponse(response, fullUrl, processedOptions);
            
            if (!processedResponse.ok) {
                let errorData;
                try {
                    errorData = await processedResponse.json();
                } catch (e) {
                    errorData = { message: processedResponse.statusText };
                }
                throw new ApiError(
                    errorData.message || 'An API error occurred', 
                    processedResponse.status, 
                    errorData.details || {}
                );
            }
            
            if (processedResponse.status === 204) {
                return null;
            }

            return processedResponse;
        } catch (error) {
            // Retry logic
            if (retryCount < this.retryConfig.maxRetries && this.retryConfig.retryCondition(error)) {
                await this.delay(this.retryConfig.retryDelay * Math.pow(2, retryCount));
                return this.request(url, options, retryCount + 1);
            }
            
            console.error('API Error:', error);
            throw error;
        }
    }
    
    /**
     * Delay utility for retry
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * GET request
     */
    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }
    
    /**
     * POST request
     */
    async post(url, data = null, options = {}) {
        const requestOptions = {
            ...options,
            method: 'POST'
        };
        
        if (data) {
            requestOptions.body = JSON.stringify(data);
        }
        
        return this.request(url, requestOptions);
    }
    
    /**
     * PUT request
     */
    async put(url, data = null, options = {}) {
        const requestOptions = {
            ...options,
            method: 'PUT'
        };
        
        if (data) {
            requestOptions.body = JSON.stringify(data);
        }
        
        return this.request(url, requestOptions);
    }
    
    /**
     * PATCH request
     */
    async patch(url, data = null, options = {}) {
        const requestOptions = {
            ...options,
            method: 'PATCH'
        };
        
        if (data) {
            requestOptions.body = JSON.stringify(data);
        }
        
        return this.request(url, requestOptions);
    }
    
    /**
     * DELETE request
     */
    async delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }
}

/**
 * Custom HTTP Error
 */
class HttpError extends Error {
    constructor(status, statusText, response) {
        super(`HTTP ${status}: ${statusText}`);
        this.name = 'HttpError';
        this.status = status;
        this.statusText = statusText;
        this.response = response;
    }
}

/**
 * Token Manager for Authentication
 */
class TokenManager {
    constructor() {
        this.accessToken = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        this.refreshPromise = null;
    }
    
    /**
     * Set tokens
     */
    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        
        if (accessToken) {
            localStorage.setItem('access_token', accessToken);
        } else {
            localStorage.removeItem('access_token');
        }
        
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        } else {
            localStorage.removeItem('refresh_token');
        }
        
        eventBus.emit('auth:tokens-updated', { accessToken, refreshToken });
    }
    
    /**
     * Get access token
     */
    getAccessToken() {
        return this.accessToken;
    }
    
    /**
     * Get refresh token
     */
    getRefreshToken() {
        return this.refreshToken;
    }
    
    /**
     * Check if tokens exist
     */
    hasTokens() {
        return !!(this.accessToken && this.refreshToken);
    }
    
    /**
     * Clear tokens
     */
    clearTokens() {
        this.setTokens(null, null);
        eventBus.emit('auth:tokens-cleared');
    }
    
    /**
     * Refresh access token
     */
    async refreshAccessToken(apiClient) {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }
        
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }
        
        this.refreshPromise = (async () => {
            try {
                const response = await apiClient.post('/auth/refresh', {
                    refreshToken: this.refreshToken
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.setTokens(data.data.accessToken, data.data.refreshToken);
                    return data.data.accessToken;
                } else {
                    throw new Error(data.error?.message || 'Token refresh failed');
                }
            } catch (error) {
                this.clearTokens();
                eventBus.emit('auth:refresh-failed', error);
                throw error;
            } finally {
                this.refreshPromise = null;
            }
        })();
        
        return this.refreshPromise;
    }
}

/**
 * API Client
 */
class ApiClient {
    constructor(baseURL = '/api') {
        this.http = new HttpClient(baseURL);
        this.tokenManager = new TokenManager();
        
        this.setupInterceptors();
        this.setupServices();
    }
    
    /**
     * Setup service instances
     */
    setupServices() {
        // Services are already defined as properties above
    }
    
    /**
     * Setup request/response interceptors
     */
    setupInterceptors() {
        // Request interceptor for authentication
        this.http.addRequestInterceptor(async (url, options) => {
            const token = this.tokenManager.getAccessToken();
            if (token) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                };
            }
            return options;
        });
        
        // Response interceptor for token refresh
        this.http.addResponseInterceptor(async (response, url, options) => {
            if (response.status === 401 && this.tokenManager.hasTokens()) {
                try {
                    // Try to refresh token
                    await this.tokenManager.refreshAccessToken(this.http);
                    
                    // Retry original request with new token
                    const newToken = this.tokenManager.getAccessToken();
                    const retryOptions = {
                        ...options,
                        headers: {
                            ...options.headers,
                            'Authorization': `Bearer ${newToken}`
                        }
                    };
                    
                    return fetch(url, retryOptions);
                } catch (error) {
                    // Refresh failed, redirect to login
                    eventBus.emit('auth:login-required');
                    throw error;
                }
            }
            
            return response;
        });
        
        // Response interceptor for error handling
        this.http.addResponseInterceptor(async (response, url, options) => {
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { message: response.statusText };
                }
                
                eventBus.emit('api:error', {
                    status: response.status,
                    url,
                    error: errorData
                });
            }
            
            return response;
        });
    }
    
    /**
     * Parse JSON response
     */
        async parseResponse(response) {
        const data = await response.json();

        if (!data.success) {
            throw new ApiError(data.error?.message || 'API request failed', response.status, data.error);
        }

        return data;
    }
    
    /**
     * Authentication methods
     */
    auth = {
        login: async (credentials) => {
            try {
                const response = await this.http.post('/auth/login', credentials);
                const responseData = await response.json();
                
                if (responseData.success) {
                    const data = responseData.data;
                    this.tokenManager.setTokens(data.accessToken, data.refreshToken);
                    eventBus.emit('auth:login-success', data.user);
                    
                    return { success: true, data };
                } else {
                    return { success: false, message: responseData.error?.message || 'Login failed' };
                }
            } catch (error) {
                console.error('Login request failed:', error);
                return { success: false, message: 'Network error during login' };
            }
        },
        
        register: async (userData) => {
            const response = await this.http.post('/auth/register', userData);
            return this.parseResponse(response);
        },
        
        logout: async () => {
            try {
                await this.http.post('/auth/logout');
            } catch (error) {
                console.warn('Logout request failed:', error);
            } finally {
                this.tokenManager.clearTokens();
                eventBus.emit('auth:logout');
            }
        },
        
        refreshToken: async () => {
            return this.tokenManager.refreshAccessToken(this.http);
        },
        
        resetPassword: async (email) => {
            const response = await this.http.post('/auth/reset-password', { email });
            return this.parseResponse(response);
        },
        
        confirmResetPassword: async (token, newPassword) => {
            const response = await this.http.post('/auth/confirm-reset-password', {
                token,
                newPassword
            });
            return this.parseResponse(response);
        }
    };
    
    /**
     * User methods
     */
    users = {
        getProfile: async () => {
            const response = await this.http.get('/users/profile');
            return this.parseResponse(response);
        },
        
        updateProfile: async (updates) => {
            const response = await this.http.put('/users/profile', updates);
            return this.parseResponse(response);
        }
    };
    
    /**
     * Workspace methods
     */
    workspaces = {
        getAll: async () => {
            try {
                const response = await this.http.get('/workspaces');
                const result = await this.parseResponse(response);
                return result.data; // Extract the data array from the response
            } catch (error) {
                console.error('Error fetching workspaces:', error);
                throw error;
            }
        },
        
        getById: async (id) => {
            try {
                const response = await this.http.get(`/workspaces/${id}`);
                return await this.parseResponse(response);
            } catch (error) {
                console.error('Error fetching workspace:', error);
                throw error;
            }
        },
        
        create: async (workspace) => {
            const response = await this.http.post('/workspaces', workspace);
            return this.parseResponse(response);
        },
        
        update: async (id, updates) => {
            const response = await this.http.put(`/workspaces/${id}`, updates);
            return this.parseResponse(response);
        },
        
        delete: async (id) => {
            const response = await this.http.delete(`/workspaces/${id}`);
            return this.parseResponse(response);
        },
        
        getMembers: async (id) => {
            const response = await this.http.get(`/workspaces/${id}/members`);
            return this.parseResponse(response);
        },
        
        inviteMember: async (id, email, role = 'member') => {
            const response = await this.http.post(`/workspaces/${id}/members`, { email, role });
            return this.parseResponse(response);
        },
        
        removeMember: async (workspaceId, userId) => {
            const response = await this.http.delete(`/workspaces/${workspaceId}/members/${userId}`);
            return this.parseResponse(response);
        }
    };
    
    /**
     * Board methods
     */
    boards = {
        getAll: async (workspaceId) => {
            const response = await this.http.get(`/workspaces/${workspaceId}/boards`);
            const result = await this.parseResponse(response);
            return result.data; // Extract the data array from the response
        },
        
        getById: async (id) => {
            const response = await this.http.get(`/boards/${id}`);
            const result = await this.parseResponse(response);
            return result.data; // Extract the data object from the response
        },
        
        create: async (workspaceId, board) => {
            const response = await this.http.post(`/workspaces/${workspaceId}/boards`, board);
            return this.parseResponse(response);
        },
        
        update: async (id, updates) => {
            const response = await this.http.put(`/boards/${id}`, updates);
            return this.parseResponse(response);
        },
        
        delete: async (id) => {
            const response = await this.http.delete(`/boards/${id}`);
            return this.parseResponse(response);
        }
    };
    
    /**
     * Item methods
     */
    items = {
        getAll: async (boardId) => {
            const response = await this.http.get(`/boards/${boardId}/items`);
            const result = await this.parseResponse(response);
            return result.data; // Extract the data array from the response
        },
        
        getById: async (id) => {
            const response = await this.http.get(`/items/${id}`);
            return this.parseResponse(response);
        },
        
        create: async (boardId, item) => {
            const response = await this.http.post(`/boards/${boardId}/items`, item);
            return this.parseResponse(response);
        },
        
        update: async (id, updates) => {
            const response = await this.http.put(`/items/${id}`, updates);
            return this.parseResponse(response);
        },
        
        delete: async (id) => {
            const response = await this.http.delete(`/items/${id}`);
            return this.parseResponse(response);
        },
        
        move: async (id, position, columnId) => {
            const response = await this.http.post(`/items/${id}/move`, { position, columnId });
            return this.parseResponse(response);
        }
    };
    
    /**
     * Search methods
     */
    search = {
        items: async (query, options = {}) => {
            const params = new URLSearchParams({ q: query, ...options });
            const response = await this.http.get(`/search/items?${params}`);
            return this.parseResponse(response);
        },
        
        comments: async (query, options = {}) => {
            const params = new URLSearchParams({ q: query, ...options });
            const response = await this.http.get(`/search/comments?${params}`);
            return this.parseResponse(response);
        },
        
        boards: async (query, options = {}) => {
            const params = new URLSearchParams({ q: query, ...options });
            const response = await this.http.get(`/search/boards?${params}`);
            return this.parseResponse(response);
        }
    };
    
    /**
     * Filter methods
     */
    filter = {
        items: async (filterQuery, options = {}) => {
            const response = await this.http.post('/filter/items', { query: filterQuery, ...options });
            return this.parseResponse(response);
        },
        
        comments: async (filterQuery, options = {}) => {
            const response = await this.http.post('/filter/comments', { query: filterQuery, ...options });
            return this.parseResponse(response);
        },
        
        boards: async (filterQuery, options = {}) => {
            const response = await this.http.post('/filter/boards', { query: filterQuery, ...options });
            return this.parseResponse(response);
        },
        
        searchAndFilter: async (entityType, searchQuery, filterQuery, options = {}) => {
            const response = await this.http.post(`/filter/search/${entityType}`, {
                searchQuery,
                filterQuery,
                ...options
            });
            return this.parseResponse(response);
        }
    };
    
    /**
     * Saved Filter methods
     */
    savedFilters = {
        getAll: async (workspaceId, entityType) => {
            const params = new URLSearchParams({ workspace_id: workspaceId });
            if (entityType) params.append('entity_type', entityType);
            
            const response = await this.http.get(`/saved-filters?${params}`);
            return this.parseResponse(response);
        },
        
        getPublic: async (workspaceId, entityType) => {
            const params = new URLSearchParams({ workspace_id: workspaceId });
            if (entityType) params.append('entity_type', entityType);
            
            const response = await this.http.get(`/saved-filters/public?${params}`);
            return this.parseResponse(response);
        },
        
        getMostUsed: async (workspaceId, entityType, limit = 10) => {
            const params = new URLSearchParams({ 
                workspace_id: workspaceId,
                limit: limit.toString()
            });
            if (entityType) params.append('entity_type', entityType);
            
            const response = await this.http.get(`/saved-filters/most-used?${params}`);
            return this.parseResponse(response);
        },
        
        getById: async (id) => {
            const response = await this.http.get(`/saved-filters/${id}`);
            return this.parseResponse(response);
        },
        
        create: async (filter) => {
            const response = await this.http.post('/saved-filters', filter);
            return this.parseResponse(response);
        },
        
        update: async (id, updates) => {
            const response = await this.http.put(`/saved-filters/${id}`, updates);
            return this.parseResponse(response);
        },
        
        delete: async (id) => {
            const response = await this.http.delete(`/saved-filters/${id}`);
            return this.parseResponse(response);
        },
        
        use: async (id) => {
            const response = await this.http.post(`/saved-filters/${id}/use`);
            return this.parseResponse(response);
        }
    };
}

// Export singleton instance
export const api = new ApiClient();

// Export error classes
export { HttpError };