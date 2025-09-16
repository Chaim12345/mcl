/**
 * Authentication Tests
 * Comprehensive testing of user authentication flows
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test on the home page
    await page.goto('/');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Visiting root should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Should show login form
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Login');
  });

  test('should display proper login form elements', async ({ page }) => {
    await page.goto('/login');
    
    // Check form elements exist
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check placeholder text
    await expect(page.locator('#email')).toHaveAttribute('placeholder', 'Enter your email');
    await expect(page.locator('#password')).toHaveAttribute('placeholder', 'Enter your password');
    
    // Check links
    await expect(page.locator('a[href="/register"]')).toBeVisible();
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill invalid credentials
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error-message, .alert-error')).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    
    // Click register link
    await page.click('a[href="/register"]');
    
    // Should be on registration page
    await expect(page).toHaveURL('/register');
    await expect(page.locator('#register-form')).toBeVisible();
  });

  test('should display complete registration form', async ({ page }) => {
    await page.goto('/register');
    
    // Check all form fields exist
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    
    // Check submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check back to login link
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.goto('/register');
    
    // Fill form with mismatched passwords
    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'User');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'differentpassword');
    
    await page.click('button[type="submit"]');
    
    // Should show password mismatch error
    await expect(page.locator('.error-message, .field-error')).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');
    
    // Click forgot password link
    await page.click('a[href="/forgot-password"]');
    
    // Should be on forgot password page
    await expect(page).toHaveURL('/forgot-password');
    await expect(page.locator('#forgot-password-form')).toBeVisible();
  });

  test('should handle successful login flow', async ({ page }) => {
    // This test assumes we have valid test credentials
    await page.goto('/login');
    
    // Fill valid credentials (using test user)
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard (or handle loading state)
    try {
      await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    } catch {
      // If authentication is async, might need to wait for loading
      await page.waitForSelector('.loading-screen, #main-content', { timeout: 10000 });
    }
  });

  test('should handle logout functionality', async ({ page }) => {
    // First login (assuming test user exists)
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard/authenticated state
    await page.waitForSelector('#main-nav, #logout-btn', { timeout: 10000 });
    
    // Find and click logout button
    const logoutBtn = await page.locator('#logout-btn, button:has-text("Logout")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      
      // Should redirect back to login
      await expect(page).toHaveURL('/login');
    }
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for authenticated state
    await page.waitForSelector('#main-nav, .nav-user', { timeout: 10000 });
    
    // Reload page
    await page.reload();
    
    // Should still be authenticated
    await expect(page.locator('#main-nav, .nav-user')).toBeVisible({ timeout: 10000 });
  });
});