/**
 * API Client Tests
 */

import { api, ApiError, HttpError } from '../js/services/api.js';
import { eventBus } from '../js/utils/events.js';

/**
 * Simple Test Framework
 */
class TestFramework {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }
    
    describe(description, testFn) {
        console.group(`📋 ${description}`);
        testFn();
        console.groupEnd();
    }
    
    it(description, testFn) {
        this.results.total++;
        
        try {
            const result = testFn();
            
            // Handle async tests
            if (result instanceof Promise) {
                return result
                    .then(() => {
                        this.results.passed++;
                        console.log(`✅ ${description}`);
                    })
                    .catch((error) => {
                        this.results.failed++;
                        console.error(`❌ ${description}`, error);
                    });
            } else {
                this.results.passed++;
                console.log(`✅ ${description}`);
            }
        } catch (error) {
            this.results.failed++;
            console.error(`❌ ${description}`, error);
        }
    }
    
    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected}, but got ${actual}`);
                }
            },
            
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
                }
            },
            
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected truthy value, but got ${actual}`);
                }
            },
            
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected falsy value, but got ${actual}`);
                }
            },
            
            toThrow: () => {
                if (typeof actual !== 'function') {
                    throw new Error('Expected a function');
                }
                
                let threw = false;
                try {
                    actual();
                } catch (error) {
                    threw = true;
                }
                
                if (!threw) {
                    throw new Error('Expected function to throw');
                }
            },
            
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            },
            
            toHaveProperty: (property) => {
                if (!(property in actual)) {
                    throw new Error(`Expected object to have property ${property}`);
                }
            }
        };
    }
    
    async runAll() {
        console.log('🧪 Running API Client Tests...\n');
        
        // Wait for all async tests to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('\n📊 Test Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Total: ${this.results.total}`);
        console.log(`📊 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        return this.results;
    }
}

const test = new TestFramework();

/**
 * Mock Fetch for Testing
 */
class MockFetch {
    constructor() {
        this.originalFetch = window.fetch;
        this.responses = new Map();
        this.requests = [];
    }
    
    mock() {
        window.fetch = this.mockFetch.bind(this);
    }
    
    restore() {
        window.fetch = this.originalFetch;
        this.responses.clear();
        this.requests = [];
    }
    
    mockResponse(url, response, options = {}) {
        const key = `${options.method || 'GET'} ${url}`;
        this.responses.set(key, {
            status: options.status || 200,
            statusText: options.statusText || 'OK',
            ok: (options.status || 200) < 400,
            json: () => Promise.resolve(response),
            text: () => Promise.resolve(JSON.stringify(response)),
            headers: new Map(Object.entries(options.headers || {}))
        });
    }
    
    async mockFetch(url, options = {}) {
        const method = options.method || 'GET';
        const key = `${method} ${url}`;
        
        // Record request
        this.requests.push({ url, options });
        
        // Return mock response
        if (this.responses.has(key)) {
            return this.responses.get(key);
        }
        
        // Default response
        return {
            status: 404,
            statusText: 'Not Found',
            ok: false,
            json: () => Promise.resolve({ error: 'Not found' }),
            text: () => Promise.resolve('Not found')
        };
    }
    
    getRequests() {
        return this.requests;
    }
    
    getLastRequest() {
        return this.requests[this.requests.length - 1];
    }
}

const mockFetch = new MockFetch();

/**
 * Test Suite
 */
export function runApiClientTests() {
    // Setup
    mockFetch.mock();
    
    test.describe('HttpClient', () => {
        test.it('should make GET requests', async () => {
            mockFetch.mockResponse('/api/test', { success: true, data: 'test' });
            
            const response = await api.http.get('/test');
            const data = await response.json();
            
            test.expect(data.success).toBe(true);
            test.expect(data.data).toBe('test');
        });
        
        test.it('should make POST requests', async () => {
            mockFetch.mockResponse('/api/test', { success: true, data: 'created' }, { method: 'POST' });
            
            const response = await api.http.post('/test', { name: 'test' });
            const data = await response.json();
            
            test.expect(data.success).toBe(true);
            test.expect(data.data).toBe('created');
            
            const lastRequest = mockFetch.getLastRequest();
            test.expect(lastRequest.options.method).toBe('POST');
            test.expect(lastRequest.options.body).toContain('test');
        });
        
        test.it('should handle request interceptors', async () => {
            let interceptorCalled = false;
            
            api.http.addRequestInterceptor(async (url, options) => {
                interceptorCalled = true;
                options.headers['X-Test'] = 'intercepted';
                return options;
            });
            
            mockFetch.mockResponse('/api/test', { success: true });
            await api.http.get('/test');
            
            test.expect(interceptorCalled).toBe(true);
            
            const lastRequest = mockFetch.getLastRequest();
            test.expect(lastRequest.options.headers['X-Test']).toBe('intercepted');
        });
        
        test.it('should handle response interceptors', async () => {
            let interceptorCalled = false;
            
            api.http.addResponseInterceptor(async (response) => {
                interceptorCalled = true;
                return response;
            });
            
            mockFetch.mockResponse('/api/test', { success: true });
            await api.http.get('/test');
            
            test.expect(interceptorCalled).toBe(true);
        });
        
        test.it('should retry failed requests', async () => {
            let requestCount = 0;
            
            // Mock fetch to fail first two times, succeed third time
            window.fetch = async (url, options) => {
                requestCount++;
                if (requestCount < 3) {
                    throw new Error('Network error');
                }
                return {
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ success: true })
                };
            };
            
            const response = await api.http.get('/test');
            const data = await response.json();
            
            test.expect(requestCount).toBe(3);
            test.expect(data.success).toBe(true);
        });
    });
    
    test.describe('TokenManager', () => {
        test.it('should store and retrieve tokens', () => {
            api.tokenManager.setTokens('access123', 'refresh456');
            
            test.expect(api.tokenManager.getAccessToken()).toBe('access123');
            test.expect(api.tokenManager.getRefreshToken()).toBe('refresh456');
            test.expect(api.tokenManager.hasTokens()).toBe(true);
        });
        
        test.it('should clear tokens', () => {
            api.tokenManager.setTokens('access123', 'refresh456');
            api.tokenManager.clearTokens();
            
            test.expect(api.tokenManager.getAccessToken()).toBe(null);
            test.expect(api.tokenManager.getRefreshToken()).toBe(null);
            test.expect(api.tokenManager.hasTokens()).toBe(false);
        });
        
        test.it('should emit events when tokens change', () => {
            let eventEmitted = false;
            
            const unsubscribe = eventBus.on('auth:tokens-updated', () => {
                eventEmitted = true;
            });
            
            api.tokenManager.setTokens('new-access', 'new-refresh');
            
            test.expect(eventEmitted).toBe(true);
            unsubscribe();
        });
    });
    
    test.describe('Authentication API', () => {
        test.it('should login successfully', async () => {
            mockFetch.mockResponse('/api/auth/login', {
                success: true,
                data: {
                    user: { id: '1', email: 'test@example.com' },
                    accessToken: 'access123',
                    refreshToken: 'refresh456'
                }
            }, { method: 'POST' });
            
            const result = await api.auth.login({
                email: 'test@example.com',
                password: 'password123'
            });
            
            test.expect(result.user.email).toBe('test@example.com');
            test.expect(api.tokenManager.getAccessToken()).toBe('access123');
        });
        
        test.it('should register successfully', async () => {
            mockFetch.mockResponse('/api/auth/register', {
                success: true,
                data: { message: 'Registration successful' }
            }, { method: 'POST' });
            
            const result = await api.auth.register({
                email: 'new@example.com',
                password: 'password123',
                name: 'New User'
            });
            
            test.expect(result.message).toBe('Registration successful');
        });
        
        test.it('should logout successfully', async () => {
            api.tokenManager.setTokens('access123', 'refresh456');
            
            mockFetch.mockResponse('/api/auth/logout', {
                success: true
            }, { method: 'POST' });
            
            await api.auth.logout();
            
            test.expect(api.tokenManager.hasTokens()).toBe(false);
        });
    });
    
    test.describe('Workspace API', () => {
        test.it('should get all workspaces', async () => {
            mockFetch.mockResponse('/api/workspaces', {
                success: true,
                data: [
                    { id: '1', name: 'Workspace 1' },
                    { id: '2', name: 'Workspace 2' }
                ]
            });
            
            const workspaces = await api.workspaces.getAll();
            
            test.expect(workspaces.length).toBe(2);
            test.expect(workspaces[0].name).toBe('Workspace 1');
        });
        
        test.it('should create workspace', async () => {
            mockFetch.mockResponse('/api/workspaces', {
                success: true,
                data: { id: '3', name: 'New Workspace' }
            }, { method: 'POST' });
            
            const workspace = await api.workspaces.create({
                name: 'New Workspace',
                description: 'A new workspace'
            });
            
            test.expect(workspace.name).toBe('New Workspace');
        });
    });
    
    test.describe('Search API', () => {
        test.it('should search items', async () => {
            mockFetch.mockResponse('/api/search/items?q=test&workspace_id=123', {
                success: true,
                data: {
                    items: [{ id: '1', name: 'Test Item' }],
                    totalCount: 1
                }
            });
            
            const result = await api.search.items('test', { workspace_id: '123' });
            
            test.expect(result.items.length).toBe(1);
            test.expect(result.items[0].name).toBe('Test Item');
        });
        
        test.it('should search comments', async () => {
            mockFetch.mockResponse('/api/search/comments?q=comment&workspace_id=123', {
                success: true,
                data: {
                    items: [{ id: '1', content: 'Test comment' }],
                    totalCount: 1
                }
            });
            
            const result = await api.search.comments('comment', { workspace_id: '123' });
            
            test.expect(result.items.length).toBe(1);
            test.expect(result.items[0].content).toBe('Test comment');
        });
    });
    
    test.describe('Filter API', () => {
        test.it('should filter items', async () => {
            mockFetch.mockResponse('/api/filter/items', {
                success: true,
                data: {
                    items: [{ id: '1', name: 'Filtered Item' }],
                    totalCount: 1
                }
            }, { method: 'POST' });
            
            const filterQuery = {
                groups: [{
                    logic: 'and',
                    conditions: [{
                        field: 'status',
                        operator: 'equals',
                        value: 'active',
                        type: 'text'
                    }]
                }],
                logic: 'and'
            };
            
            const result = await api.filter.items(filterQuery, { workspace_id: '123' });
            
            test.expect(result.items.length).toBe(1);
            test.expect(result.items[0].name).toBe('Filtered Item');
        });
        
        test.it('should combine search and filter', async () => {
            mockFetch.mockResponse('/api/filter/search/item', {
                success: true,
                data: {
                    items: [{ id: '1', name: 'Combined Result' }],
                    totalCount: 1
                }
            }, { method: 'POST' });
            
            const result = await api.filter.searchAndFilter(
                'item',
                'search query',
                { groups: [], logic: 'and' },
                { workspace_id: '123' }
            );
            
            test.expect(result.items.length).toBe(1);
            test.expect(result.items[0].name).toBe('Combined Result');
        });
    });
    
    test.describe('Saved Filters API', () => {
        test.it('should get saved filters', async () => {
            mockFetch.mockResponse('/api/saved-filters?workspace_id=123', {
                success: true,
                data: [
                    { id: '1', name: 'My Filter', entityType: 'item' }
                ]
            });
            
            const filters = await api.savedFilters.getAll('123');
            
            test.expect(filters.length).toBe(1);
            test.expect(filters[0].name).toBe('My Filter');
        });
        
        test.it('should create saved filter', async () => {
            mockFetch.mockResponse('/api/saved-filters', {
                success: true,
                data: { id: '2', name: 'New Filter' }
            }, { method: 'POST' });
            
            const filter = await api.savedFilters.create({
                name: 'New Filter',
                workspaceId: '123',
                entityType: 'item',
                query: { groups: [], logic: 'and' }
            });
            
            test.expect(filter.name).toBe('New Filter');
        });
    });
    
    test.describe('Error Handling', () => {
        test.it('should handle API errors', async () => {
            mockFetch.mockResponse('/api/error', {
                success: false,
                error: { message: 'Something went wrong' }
            }, { status: 400 });
            
            try {
                await api.http.get('/error');
                await api.parseResponse(await api.http.get('/error'));
                test.expect(false).toBe(true); // Should not reach here
            } catch (error) {
                test.expect(error).toHaveProperty('message');
                test.expect(error.message).toContain('Something went wrong');
            }
        });
        
        test.it('should handle network errors', async () => {
            window.fetch = () => Promise.reject(new Error('Network error'));
            
            try {
                await api.http.get('/network-error');
                test.expect(false).toBe(true); // Should not reach here
            } catch (error) {
                test.expect(error.message).toBe('Network error');
            }
        });
        
        test.it('should emit error events', async () => {
            let errorEmitted = false;
            
            const unsubscribe = eventBus.on('api:error', () => {
                errorEmitted = true;
            });
            
            mockFetch.mockResponse('/api/error', {
                success: false,
                error: { message: 'Test error' }
            }, { status: 500 });
            
            try {
                await api.http.get('/error');
            } catch (error) {
                // Expected to fail
            }
            
            test.expect(errorEmitted).toBe(true);
            unsubscribe();
        });
    });
    
    // Cleanup
    test.describe('Cleanup', () => {
        test.it('should restore original fetch', () => {
            mockFetch.restore();
            test.expect(window.fetch).toBe(mockFetch.originalFetch);
        });
    });
    
    return test.runAll();
}