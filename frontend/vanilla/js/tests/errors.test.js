/**
 * Error Handling System Tests
 */

import {
    APIError,
    ValidationError,
    NetworkError,
    AuthenticationError,
    ErrorLogger,
    ErrorDisplay,
    ErrorRecovery,
    ErrorHandler,
    handleError,
    showSuccess,
    showInfo,
    showWarning
} from '../utils/errors.js';

// Mock DOM environment for testing
function setupTestDOM() {
    if (typeof document === 'undefined') {
        global.document = {
            createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
            body: { appendChild: () => {} },
            head: { appendChild: () => {} },
            getElementById: () => null,
            readyState: 'complete'
        };
        global.window = {
            addEventListener: () => {},
            location: { href: 'http://test.com', pathname: '/test' },
            navigator: { userAgent: 'test' }
        };
        global.localStorage = {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        };
        global.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
    }
}

describe('Error Classes', () => {
    test('APIError should create proper error object', () => {
        const error = new APIError('NOT_FOUND', 'Resource not found', { id: 123 }, 404);
        
        expect(error.name).toBe('APIError');
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('Resource not found');
        expect(error.details).toEqual({ id: 123 });
        expect(error.statusCode).toBe(404);
        expect(error.timestamp).toBeDefined();
    });

    test('ValidationError should create proper error object', () => {
        const error = new ValidationError('email', 'Invalid email format', 'invalid-email');
        
        expect(error.name).toBe('ValidationError');
        expect(error.field).toBe('email');
        expect(error.message).toBe('Invalid email format');
        expect(error.value).toBe('invalid-email');
        expect(error.timestamp).toBeDefined();
    });

    test('NetworkError should create proper error object', () => {
        const error = new NetworkError('Connection failed', '/api/users', 'GET');
        
        expect(error.name).toBe('NetworkError');
        expect(error.message).toBe('Connection failed');
        expect(error.url).toBe('/api/users');
        expect(error.method).toBe('GET');
        expect(error.timestamp).toBeDefined();
    });

    test('AuthenticationError should create proper error object', () => {
        const error = new AuthenticationError('Token expired', 'login');
        
        expect(error.name).toBe('AuthenticationError');
        expect(error.message).toBe('Token expired');
        expect(error.action).toBe('login');
        expect(error.timestamp).toBeDefined();
    });
});

describe('ErrorLogger', () => {
    let logger;

    beforeEach(() => {
        setupTestDOM();
        logger = new ErrorLogger();
    });

    test('should log errors with proper structure', () => {
        const error = new APIError('TEST_ERROR', 'Test error message');
        const context = { component: 'TestComponent' };
        
        const logEntry = logger.log(error, context);
        
        expect(logEntry.id).toBeDefined();
        expect(logEntry.timestamp).toBeDefined();
        expect(logEntry.error.name).toBe('APIError');
        expect(logEntry.error.message).toBe('Test error message');
        expect(logEntry.context).toEqual(context);
        expect(logEntry.userAgent).toBeDefined();
        expect(logEntry.url).toBeDefined();
    });

    test('should maintain log history', () => {
        const error1 = new Error('First error');
        const error2 = new Error('Second error');
        
        logger.log(error1);
        logger.log(error2);
        
        const logs = logger.getLogs();
        expect(logs.length).toBe(2);
        expect(logs[0].error.message).toBe('Second error'); // Most recent first
        expect(logs[1].error.message).toBe('First error');
    });

    test('should limit log history', () => {
        logger.maxLogs = 2;
        
        logger.log(new Error('Error 1'));
        logger.log(new Error('Error 2'));
        logger.log(new Error('Error 3'));
        
        const logs = logger.getLogs();
        expect(logs.length).toBe(2);
        expect(logs[0].error.message).toBe('Error 3');
        expect(logs[1].error.message).toBe('Error 2');
    });

    test('should clear logs', () => {
        logger.log(new Error('Test error'));
        expect(logger.getLogs().length).toBe(1);
        
        logger.clearLogs();
        expect(logger.getLogs().length).toBe(0);
    });
});

describe('ErrorRecovery', () => {
    let recovery;

    beforeEach(() => {
        recovery = new ErrorRecovery();
    });

    test('should retry failed operations', async () => {
        let attempts = 0;
        const operation = () => {
            attempts++;
            if (attempts < 3) {
                throw new Error('Operation failed');
            }
            return 'success';
        };

        const result = await recovery.retry(operation, { maxRetries: 3, delay: 10 });
        
        expect(result).toBe('success');
        expect(attempts).toBe(3);
    });

    test('should fail after max retries', async () => {
        const operation = () => {
            throw new Error('Always fails');
        };

        await expect(recovery.retry(operation, { maxRetries: 2, delay: 10 }))
            .rejects.toThrow('Always fails');
    });

    test('should use exponential backoff', async () => {
        const startTime = Date.now();
        let attempts = 0;
        
        const operation = () => {
            attempts++;
            if (attempts < 3) {
                throw new Error('Operation failed');
            }
            return 'success';
        };

        await recovery.retry(operation, { maxRetries: 3, delay: 10, backoff: true });
        
        const duration = Date.now() - startTime;
        // Should take at least 10 + 20 = 30ms with backoff
        expect(duration).toBeGreaterThan(25);
    });
});

describe('ErrorHandler Integration', () => {
    let handler;

    beforeEach(() => {
        setupTestDOM();
        handler = new ErrorHandler();
    });

    test('should handle different error types', () => {
        const apiError = new APIError('API_ERROR', 'API failed');
        const validationError = new ValidationError('field', 'Invalid');
        const networkError = new NetworkError('Network failed');
        const authError = new AuthenticationError('Auth failed');

        // Should not throw
        expect(() => handler.handle(apiError)).not.toThrow();
        expect(() => handler.handle(validationError)).not.toThrow();
        expect(() => handler.handle(networkError)).not.toThrow();
        expect(() => handler.handle(authError)).not.toThrow();
    });

    test('should provide convenience methods', () => {
        expect(() => handler.showSuccess('Success message')).not.toThrow();
        expect(() => handler.showInfo('Info message')).not.toThrow();
        expect(() => handler.showWarning('Warning message')).not.toThrow();
    });

    test('should wrap async operations', async () => {
        const successOperation = async () => 'success';
        const failOperation = async () => { throw new Error('Failed'); };

        const result = await handler.wrapAsync(successOperation);
        expect(result).toBe('success');

        await expect(handler.wrapAsync(failOperation))
            .rejects.toThrow('Failed');
    });
});

// Manual testing functions (for browser console)
if (typeof window !== 'undefined') {
    window.testErrorHandling = {
        testAPIError: () => {
            const error = new APIError('TEST_API_ERROR', 'This is a test API error', null, 500);
            handleError(error);
        },
        
        testValidationError: () => {
            const error = new ValidationError('email', 'Please enter a valid email address', 'invalid-email');
            handleError(error);
        },
        
        testNetworkError: () => {
            const error = new NetworkError('Failed to connect to server', '/api/test', 'GET');
            handleError(error);
        },
        
        testAuthError: () => {
            const error = new AuthenticationError('Your session has expired', 'login');
            handleError(error);
        },
        
        testSuccess: () => {
            showSuccess('Operation completed successfully!');
        },
        
        testInfo: () => {
            showInfo('This is an informational message.');
        },
        
        testWarning: () => {
            showWarning('This is a warning message.');
        },
        
        testRetry: async () => {
            let attempts = 0;
            const operation = () => {
                attempts++;
                console.log(`Attempt ${attempts}`);
                if (attempts < 3) {
                    throw new Error('Operation failed, retrying...');
                }
                return 'Success after retries!';
            };
            
            try {
                const result = await retry(operation, { maxRetries: 5, delay: 1000 });
                showSuccess(result);
            } catch (error) {
                handleError(error);
            }
        }
    };
    
    console.log('Error handling test functions available:', Object.keys(window.testErrorHandling));
    console.log('Try: testErrorHandling.testAPIError()');
}