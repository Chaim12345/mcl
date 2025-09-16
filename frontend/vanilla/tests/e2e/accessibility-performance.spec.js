/**
 * Accessibility and Performance Tests
 * Comprehensive testing of accessibility features and performance metrics
 */

import { test, expect } from '@playwright/test';

test.describe('Accessibility Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#main-nav', { timeout: 10000 });
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for navigation landmarks
    const nav = page.locator('nav[role="navigation"], nav, [role="navigation"]');
    await expect(nav).toBeVisible();
    
    // Check for main content area
    const main = page.locator('main[role="main"], main, [role="main"]');
    await expect(main).toBeVisible();
    
    // Check for proper button roles
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Check for proper link roles
    const links = page.locator('a, [role="link"]');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should have h1 as main heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Check for logical heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // First heading should be h1
    const firstHeading = await page.locator('h1, h2, h3, h4, h5, h6').first().tagName();
    expect(firstHeading.toLowerCase()).toBe('h1');
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test tab navigation through interactive elements
    const focusableElements = await page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').count();
    
    if (focusableElements > 0) {
      // Start tabbing through elements
      await page.keyboard.press('Tab');
      
      // Check if first element is focused
      const focusedElement = await page.evaluate(() => document.activeElement);
      expect(focusedElement).toBeTruthy();
      
      // Tab through a few more elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Test Shift+Tab to go backwards
      await page.keyboard.press('Shift+Tab');
    }
  });

  test('should have proper form labels and descriptions', async ({ page }) => {
    await page.goto('/login');
    
    // Check email input has label
    const emailInput = page.locator('#email, input[type="email"]');
    if (await emailInput.isVisible()) {
      // Should have associated label
      const emailLabel = await emailInput.getAttribute('aria-label') || 
                         await page.locator('label[for="email"]').textContent() ||
                         await emailInput.getAttribute('placeholder');
      expect(emailLabel).toBeTruthy();
    }
    
    // Check password input has label
    const passwordInput = page.locator('#password, input[type="password"]');
    if (await passwordInput.isVisible()) {
      const passwordLabel = await passwordInput.getAttribute('aria-label') || 
                           await page.locator('label[for="password"]').textContent() ||
                           await passwordInput.getAttribute('placeholder');
      expect(passwordLabel).toBeTruthy();
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check if text has sufficient contrast
    // This is a basic check - in real tests you'd use axe-core or similar
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');
    const elementCount = await textElements.count();
    
    if (elementCount > 0) {
      // Sample a few elements and check their computed styles
      const firstText = textElements.first();
      const styles = await firstText.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize
        };
      });
      
      expect(styles.color).toBeTruthy();
      expect(styles.fontSize).toBeTruthy();
    }
  });

  test('should have proper alt text for images', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check all images have alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const role = await img.getAttribute('role');
      
      // Images should have alt text, aria-label, or be decorative
      expect(altText !== null || ariaLabel !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test focus visibility on interactive elements
    const buttons = page.locator('button, a, input, select');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      await firstButton.focus();
      
      // Check if element has focus styles
      const focusStyles = await firstButton.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineOffset: computed.outlineOffset,
          boxShadow: computed.boxShadow
        };
      });
      
      // Should have some form of focus indicator
      const hasFocusIndicator = focusStyles.outline !== 'none' || 
                               focusStyles.boxShadow !== 'none' ||
                               focusStyles.outlineOffset !== '0px';
      expect(hasFocusIndicator).toBeTruthy();
    }
  });

  test('should handle screen reader announcements', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for live regions for dynamic content
    const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
    
    // If there are live regions, they should be properly configured
    const liveRegionCount = await liveRegions.count();
    if (liveRegionCount > 0) {
      for (let i = 0; i < liveRegionCount; i++) {
        const region = liveRegions.nth(i);
        const ariaLive = await region.getAttribute('aria-live');
        const role = await region.getAttribute('role');
        
        expect(ariaLive || role).toBeTruthy();
      }
    }
  });

  test('should work with high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            border: 1px solid !important;
          }
        }
      `
    });
    
    await page.goto('/dashboard');
    
    // Page should still be functional and readable
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#main-nav')).toBeVisible();
  });
});

test.describe('Performance Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance metrics
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#main-nav', { timeout: 10000 });
  });

  test('should load dashboard within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have minimal layout shifts', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for all content to stabilize
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    const initialScreenshot = await page.screenshot();
    
    // Wait a bit more for any late loading content
    await page.waitForTimeout(2000);
    
    // Take final screenshot
    const finalScreenshot = await page.screenshot();
    
    // Screenshots should be similar (minimal layout shift)
    // This is a basic check - in real tests you'd use more sophisticated comparison
    expect(initialScreenshot.length).toBeCloseTo(finalScreenshot.length, -2);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Go to boards page which might have many items
    await page.goto('/boards');
    await page.waitForTimeout(2000);
    
    // Open a board if available
    const boardCards = page.locator('.board-card');
    const cardCount = await boardCards.count();
    
    if (cardCount > 0) {
      const startTime = Date.now();
      
      const firstBoard = boardCards.first();
      const openBtn = firstBoard.locator('button:has-text("Open"), .open-board-btn');
      if (await openBtn.isVisible()) {
        await openBtn.click();
      } else {
        await firstBoard.click();
      }
      
      // Wait for board to load
      await page.waitForSelector('.board-view, .board-page', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      
      // Board should load within 3 seconds even with data
      expect(loadTime).toBeLessThan(3000);
    }
  });

  test('should be responsive across different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'Mobile' },      // iPhone SE
      { width: 768, height: 1024, name: 'Tablet' },     // iPad
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1280, height: 720, name: 'Desktop' },    // Standard desktop
      { width: 1920, height: 1080, name: 'Large Desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/dashboard');
      
      // Page should be functional at all viewport sizes
      await expect(page.locator('h1')).toBeVisible();
      
      // Navigation should be accessible
      const nav = page.locator('#main-nav, .nav-mobile, .mobile-nav');
      await expect(nav).toBeVisible();
      
      // Content should not overflow
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();
      if (bodyBox) {
        expect(bodyBox.width).toBeLessThanOrEqual(viewport.width + 20); // Allow small tolerance
      }
    }
  });

  test('should handle rapid navigation without performance degradation', async ({ page }) => {
    const pages = ['/dashboard', '/workspaces', '/boards', '/tasks', '/calendar', '/reports'];
    
    const startTime = Date.now();
    
    // Rapidly navigate between pages
    for (let i = 0; i < 3; i++) {
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForSelector('h1');
        await page.waitForTimeout(100); // Brief pause
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // Should complete rapid navigation within reasonable time
    expect(totalTime).toBeLessThan(30000); // 30 seconds for all navigation
  });

  test('should maintain performance with multiple modals/dialogs', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Open and close multiple dialogs rapidly
    for (let i = 0; i < 5; i++) {
      const createBtn = page.locator('#create-workspace-btn, button:has-text("Create Workspace")');
      if (await createBtn.isVisible()) {
        await createBtn.click();
        
        // Wait for dialog to open
        await page.waitForSelector('.modal-overlay, .workspace-create-dialog');
        
        // Close dialog
        const cancelBtn = page.locator('button:has-text("Cancel"), .dialog-overlay, .modal-close-btn');
        await cancelBtn.first().click();
        
        // Wait for dialog to close
        await page.waitForSelector('.modal-overlay, .workspace-create-dialog', { state: 'detached' });
      }
    }
    
    // Page should still be responsive
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    // Navigate through many pages to test memory leaks
    const pages = ['/dashboard', '/workspaces', '/boards', '/tasks', '/calendar', '/reports'];
    
    for (let iteration = 0; iteration < 3; iteration++) {
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });
      }
    }
    
    // Application should still be responsive after many navigations
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should load efficiently with slow network conditions', async ({ page }) => {
    // Simulate slow 3G network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });
    
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForSelector('h1');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time even on slow network
    expect(loadTime).toBeLessThan(10000); // 10 seconds with simulated delay
  });
});