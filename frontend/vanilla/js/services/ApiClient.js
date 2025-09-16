/**
 * API Client with integrated error handling
 */

import { 
    APIError, 
    NetworkError, 
    AuthenticationError,
    handleError,
    retry 
} from '../utils/errors.js';

export class ApiClient {
    constructor(baseURL = '/api', options = {}) {
        this.baseURL = baseURL;
        this.options = {
            timeout: 10000,
            retries: 3,
            retryDelay: 1000,
            ...options
        };
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: 'GET',
            headers: { ...this.defaultHeaders },
            ...options
        };

        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Merge headers
        if (options.headers) {
            config.headers = { ...config.headers, ...options.headers };
        }

        // Handle request body
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await this.executeRequest(url, config);
            return await this.handleResponse(response, url, config.method);
        } catch (error) {
            // Let the error handler deal with it
            throw handleError(error, {
                context: {
                    url,
                    method: config.method,
                    endpoint
                }
            });
        }
    }

    async executeRequest(url, config) {
        // Use retry mechanism for network requests
        return retry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

            try {
                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new NetworkError('Request timeout', url, config.method);
                }
                
                if (!navigator.onLine) {
                    throw new NetworkError('No internet connection', url, config.method);
                }
                
                throw new NetworkError('Network request failed', url, config.method);
            }
        }, {
            maxRetries: this.options.retries,
            delay: this.options.retryDelay,
            key: `${config.method}:${url}`
        });
    }

    async handleResponse(response, url, method) {
        const contentType = response.headers.get('content-type');
        const isJSON = contentType && contentType.includes('application/json');

        let data;
        try {
            data = isJSON ? await response.json() : await response.text();
        } catch (error) {
            throw new APIError(
                'PARSE_ERROR',
                'Failed to parse response',
                { contentType },
                response.status
            );
        }

        if (!response.ok) {
            // Handle specific HTTP status codes
            if (response.status === 401) {
                throw new AuthenticationError(
                    data.error?.message || 'Authentication required',
                    'login'
                );
            }

            if (response.status === 403) {
                throw new APIError(
                    'FORBIDDEN',
                    data.error?.message || 'Access denied',
                    data.error?.details,
                    response.status
                );
            }

            if (response.status === 404) {
                throw new APIError(
                    'NOT_FOUND',
                    data.error?.message || 'Resource not found',
                    data.error?.details,
                    response.status
                );
            }

            if (response.status >= 500) {
                throw new APIError(
                    'SERVER_ERROR',
                    data.error?.message || 'Internal server error',
                    data.error?.details,
                    response.status
                );
            }

            // Generic client error
            throw new APIError(
                data.error?.code || 'CLIENT_ERROR',
                data.error?.message || 'Request failed',
                data.error?.details,
                response.status
            );
        }

        return data;
    }

    getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    setAuthToken(token) {
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    // Convenience methods
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: data
        });
    }

    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: data
        });
    }

    async patch(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PATCH',
            body: data
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    // Upload file with progress
    async upload(endpoint, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);

        // Add additional fields if provided
        if (options.fields) {
            Object.entries(options.fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: {
                // Don't set Content-Type for FormData, let browser set it with boundary
            },
            ...options
        });
    }

    // Batch requests
    async batch(requests) {
        const results = await Promise.allSettled(
            requests.map(({ endpoint, options }) => this.request(endpoint, options))
        );

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return { success: true, data: result.value, index };
            } else {
                return { success: false, error: result.reason, index };
            }
        });
    }
}

// Create default instance
export const apiClient = new ApiClient();

// Export convenience functions
export const api = {
    get: (endpoint, options) => apiClient.get(endpoint, options),
    post: (endpoint, data, options) => apiClient.post(endpoint, data, options),
    put: (endpoint, data, options) => apiClient.put(endpoint, data, options),
    patch: (endpoint, data, options) => apiClient.patch(endpoint, data, options),
    delete: (endpoint, options) => apiClient.delete(endpoint, options),
    upload: (endpoint, file, options) => apiClient.upload(endpoint, file, options),
    batch: (requests) => apiClient.batch(requests)
};