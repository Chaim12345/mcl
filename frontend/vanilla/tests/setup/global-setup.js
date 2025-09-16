/**
 * Global Setup for Playwright Tests
 * Sets up test database, authentication, and other global state
 */

import { chromium } from '@playwright/test';

async function globalSetup(config) {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Launch browser for setup
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to the application
    const baseURL = config.webServer?.url || 'http://localhost:3000';
    await page.goto(baseURL);
    
    // Wait for application to load
    await page.waitForSelector('#app', { timeout: 30000 });
    
    // Check if backend is responding
    try {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/health');
        return res.ok;
      });
      
      if (!response) {
        console.warn('⚠️ Backend health check failed - some tests may fail');
      } else {
        console.log('✅ Backend health check passed');
      }
    } catch (error) {
      console.warn('⚠️ Could not reach backend API:', error.message);
    }
    
    // Create test user if needed
    await setupTestUser(page);
    
    // Clean up
    await browser.close();
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function setupTestUser(page) {
  try {
    // Try to register a test user
    await page.goto('/register');
    
    // Fill registration form if it exists
    const form = await page.$('#register-form');
    if (form) {
      await page.fill('#firstName', 'Test');
      await page.fill('#lastName', 'User');
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'TestPassword123!');
      await page.fill('#confirmPassword', 'TestPassword123!');
      
      // Submit form and handle potential errors
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        
        // Wait for either success or error
        try {
          await page.waitForURL('/dashboard', { timeout: 5000 });
          console.log('✅ Test user created and logged in');
        } catch {
          // User might already exist, try logging in
          await page.goto('/login');
          await page.fill('#email', 'test@example.com');
          await page.fill('#password', 'TestPassword123!');
          
          const loginButton = await page.$('button[type="submit"]');
          if (loginButton) {
            await loginButton.click();
            console.log('✅ Test user logged in');
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Test user setup skipped:', error.message);
  }
}

export default globalSetup;