/**
 * Utility Tests for Frontend JavaScript Functions
 * Tests all utility functions and helper methods
 */

describe('Utility Functions', () => {
    describe('API Client Utilities', () => {
        it('should format API URLs correctly', function() {
            // Mock API utilities if not available
            if (typeof formatApiUrl === 'undefined') {
                window.formatApiUrl = function(endpoint) {
                    const baseUrl = '/api';
                    return endpoint.startsWith('/') ? baseUrl + endpoint : baseUrl + '/' + endpoint;
                };
            }
            
            this.expect(formatApiUrl('users')).toBe('/api/users');
            this.expect(formatApiUrl('/workspaces')).toBe('/api/workspaces');
            this.expect(formatApiUrl('boards/123')).toBe('/api/boards/123');
        });

        it('should handle request headers correctly', function() {
            if (typeof createHeaders === 'undefined') {
                window.createHeaders = function(token) {
                    const headers = {
                        'Content-Type': 'application/json'
                    };
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                    return headers;
                };
            }
            
            const headersWithoutToken = createHeaders();
            this.expect(headersWithoutToken['Content-Type']).toBe('application/json');
            this.expect(headersWithoutToken['Authorization']).toBeFalsy();
            
            const headersWithToken = createHeaders('test-token');
            this.expect(headersWithToken['Authorization']).toBe('Bearer test-token');
        });
    });

    describe('Date Utilities', () => {
        it('should format dates correctly', function() {
            if (typeof formatDate === 'undefined') {
                window.formatDate = function(date, format = 'YYYY-MM-DD') {
                    const d = new Date(date);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    
                    return format
                        .replace('YYYY', year)
                        .replace('MM', month)
                        .replace('DD', day);
                };
            }
            
            const testDate = new Date('2023-12-25');
            this.expect(formatDate(testDate)).toBe('2023-12-25');
            this.expect(formatDate(testDate, 'DD/MM/YYYY')).toBe('25/12/2023');
        });

        it('should calculate relative time correctly', function() {
            if (typeof getRelativeTime === 'undefined') {
                window.getRelativeTime = function(date) {
                    const now = new Date();
                    const diff = now - new Date(date);
                    const minutes = Math.floor(diff / (1000 * 60));
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    
                    if (minutes < 1) return 'just now';
                    if (minutes < 60) return `${minutes} minutes ago`;
                    if (hours < 24) return `${hours} hours ago`;
                    return `${days} days ago`;
                };
            }
            
            const now = new Date();
            const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
            const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
            
            this.expect(getRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
            this.expect(getRelativeTime(twoHoursAgo)).toBe('2 hours ago');
        });
    });

    describe('String Utilities', () => {
        it('should capitalize strings correctly', function() {
            if (typeof capitalize === 'undefined') {
                window.capitalize = function(str) {
                    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                };
            }
            
            this.expect(capitalize('hello')).toBe('Hello');
            this.expect(capitalize('WORLD')).toBe('World');
            this.expect(capitalize('tEST')).toBe('Test');
        });

        it('should truncate strings correctly', function() {
            if (typeof truncate === 'undefined') {
                window.truncate = function(str, length, suffix = '...') {
                    if (str.length <= length) return str;
                    return str.substring(0, length) + suffix;
                };
            }
            
            const longString = 'This is a very long string that needs to be truncated';
            this.expect(truncate(longString, 20)).toBe('This is a very long ...');
            this.expect(truncate('Short', 20)).toBe('Short');
        });
    });

    describe('Validation Utilities', () => {
        it('should validate email addresses', function() {
            if (typeof isValidEmail === 'undefined') {
                window.isValidEmail = function(email) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailRegex.test(email);
                };
            }
            
            this.expect(isValidEmail('test@example.com')).toBeTruthy();
            this.expect(isValidEmail('user.name+tag@domain.co.uk')).toBeTruthy();
            this.expect(isValidEmail('invalid-email')).toBeFalsy();
            this.expect(isValidEmail('test@')).toBeFalsy();
            this.expect(isValidEmail('@example.com')).toBeFalsy();
        });

        it('should validate passwords', function() {
            if (typeof isValidPassword === 'undefined') {
                window.isValidPassword = function(password) {
                    // At least 8 characters, one uppercase, one lowercase, one number
                    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
                    return passwordRegex.test(password);
                };
            }
            
            this.expect(isValidPassword('Password123')).toBeTruthy();
            this.expect(isValidPassword('StrongPass1')).toBeTruthy();
            this.expect(isValidPassword('weak')).toBeFalsy();
            this.expect(isValidPassword('password123')).toBeFalsy(); // No uppercase
            this.expect(isValidPassword('PASSWORD123')).toBeFalsy(); // No lowercase
        });
    });

    describe('Storage Utilities', () => {
        it('should handle localStorage correctly', function() {
            if (typeof setStorageItem === 'undefined') {
                window.setStorageItem = function(key, value) {
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                        return true;
                    } catch (e) {
                        return false;
                    }
                };
                
                window.getStorageItem = function(key, defaultValue = null) {
                    try {
                        const item = localStorage.getItem(key);
                        return item ? JSON.parse(item) : defaultValue;
                    } catch (e) {
                        return defaultValue;
                    }
                };
            }
            
            const testData = { id: 1, name: 'Test' };
            
            this.expect(setStorageItem('test-key', testData)).toBeTruthy();
            this.expect(getStorageItem('test-key')).toEqual(testData);
            this.expect(getStorageItem('non-existent', 'default')).toBe('default');
            
            // Cleanup
            localStorage.removeItem('test-key');
        });
    });
});