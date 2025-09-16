// frontend/vanilla/js/tests/error-handling.test.js

import toast from '../utils/Toast.js';
import errorHandler, { ApiError } from '../utils/ErrorHandler.js';

// Mock the toast module
jest.mock('../utils/Toast.js', () => ({
    show: jest.fn(),
}));

describe('ErrorHandler', () => {
    beforeEach(() => {
        // Clear mock calls before each test
        toast.show.mockClear();
        // Mock console.error
        global.console.error = jest.fn();
    });

    test('should initialize and set up global event listeners', () => {
        const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
        new ErrorHandler(); // Re-instantiate to test init
        expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
        expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
        addEventListenerSpy.mockRestore();
    });

    test('handleGlobalError should display a toast for a generic Error', () => {
        const error = new Error('A generic error occurred');
        errorHandler.handleGlobalError(error);

        expect(toast.show).toHaveBeenCalledWith({
            title: 'An unexpected error occurred',
            message: 'Please try again later. If the problem persists, contact support.',
            type: 'error',
            duration: 10000,
            actions: expect.any(Array),
        });
        expect(console.error).toHaveBeenCalledWith('Global error caught:', error);
    });

    test('handleGlobalError should display a toast for an ApiError', () => {
        const error = new ApiError('Invalid input', 400, { field: 'name', reason: 'cannot be empty' });
        errorHandler.handleGlobalError(error);

        expect(toast.show).toHaveBeenCalledWith({
            title: 'Invalid input',
            message: '{"field":"name","reason":"cannot be empty"}',
            type: 'error',
            duration: 10000,
            actions: expect.any(Array),
        });
        expect(console.error).toHaveBeenCalledWith('Global error caught:', error);
    });

    test('reportError should log the error and context to the console', () => {
        const error = new Error('Test report');
        const context = { component: 'TestComponent' };
        errorHandler.reportError(error, context);

        expect(console.error).toHaveBeenCalledWith('Reported error:', {
            error,
            message: 'Test report',
            stack: expect.any(String),
            context,
        });
    });

    test('showToastError should call toast.show with correct parameters', () => {
        const error = new Error('A specific operation failed.');
        errorHandler.showToastError(error, { title: 'Operation Failed', duration: 5000 });

        expect(toast.show).toHaveBeenCalledWith({
            title: 'Operation Failed',
            message: 'A specific operation failed.',
            type: 'error',
            duration: 5000,
        });
    });

    test('ApiError should create an error with correct properties', () => {
        const details = { info: 'extra data' };
        const error = new ApiError('API request failed', 500, details);

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ApiError');
        expect(error.message).toBe('API request failed');
        expect(error.status).toBe(500);
        expect(error.details).toEqual(details);
    });
}); 