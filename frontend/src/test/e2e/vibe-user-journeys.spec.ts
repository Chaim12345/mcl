/**
 * End-to-End Tests for Vibe Component User Journeys
 * Using Playwright to test complete user workflows with Vibe components
 */

import { test, expect } from '@playwright/test';

test.describe('Vibe Component User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test.describe('Authentication Journey with Vibe Components', () => {
    test('complete login flow using Vibe components', async ({ page }) => {
      // Navigate to login page
      await page.goto('/login');

      // Verify Vibe components are loaded
      await expect(page.locator('[data-testid="vibe-textfield"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="vibe-button"]')).toBeVisible();

      // Fill login form using Vibe TextField components
      await page.locator('[data-testid="vibe-textfield"]').first().fill('demo@example.com');
      await page.locator('[data-testid="vibe-textfield"]').nth(1).fill('Password123!');

      // Submit using Vibe Button
      await page.locator('[data-testid="vibe-button"]').click();

      // Verify successful login with Vibe Toast notification
      await expect(page.locator('[data-testid="vibe-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="vibe-toast"]')).toHaveAttribute('data-type', 'positive');

      // Verify navigation to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('registration flow with Vibe form validation', async ({ page }) => {
      await page.goto('/register');

      // Fill registration form
      const textFields = page.locator('[data-testid="vibe-textfield"]');
      await textFields.nth(0).fill('John');
      await textFields.nth(1).fill('Doe');
      await textFields.nth(2).fill('john.doe@example.com');
      await textFields.nth(3).fill('StrongPassword123!');
      await textFields.nth(4).fill('StrongPassword123!');

      // Submit registration
      await page.locator('[data-testid="vibe-button"]').click();

      // Verify success message
      await expect(page.getByText(/check your email/i)).toBeVisible();
      await expect(page.locator('[data-testid="vibe-alert-banner"]')).toHaveAttribute('data-background', 'positive');
    });

    test('password reset flow with Vibe components', async ({ page }) => {
      await page.goto('/forgot-password');

      // Fill email field
      await page.locator('[data-testid="vibe-textfield"]').fill('user@example.com');

      // Submit request
      await page.locator('[data-testid="vibe-button"]').click();

      // Verify success state
      await expect(page.getByText(/check your email/i)).toBeVisible();
      await expect(page.locator('[data-testid="vibe-alert-banner"]')).toBeVisible();
    });
  });

  test.describe('Board Management Journey with Vibe Table', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.locator('[data-testid="vibe-textfield"]').first().fill('demo@example.com');
      await page.locator('[data-testid="vibe-textfield"]').nth(1).fill('Password123!');
      await page.locator('[data-testid="vibe-button"]').click();
      await page.waitForURL('/dashboard');
    });

    test('create and manage board items using Vibe components', async ({ page }) => {
      // Navigate to board demo
      await page.goto('/demo/vibe-board');

      // Verify Vibe Table is loaded
      await expect(page.locator('[data-testid="vibe-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="vibe-table-header"]')).toBeVisible();

      // Create new item using Vibe Modal
      await page.locator('[data-testid="vibe-button"]').first().click();
      await expect(page.locator('[data-testid="vibe-modal"]')).toBeVisible();

      // Fill item form
      await page.locator('[data-testid="vibe-textfield"]').fill('New Test Item');
      await page.locator('[data-testid="vibe-dropdown"]').selectOption('In Progress');

      // Save item
      await page.getByText(/save/i).click();

      // Verify item appears in table
      await expect(page.getByText('New Test Item')).toBeVisible();
      await expect(page.locator('[data-testid="vibe-toast"]')).toHaveAttribute('data-type', 'positive');
    });

    test('filter board items using Vibe Dropdown components', async ({ page }) => {
      await page.goto('/demo/vibe-board');

      // Open filters
      await page.getByText(/filter/i).click();

      // Apply status filter using Vibe Dropdown
      await page.locator('[data-testid="vibe-dropdown"]').first().selectOption('Done');
      await page.getByText(/apply/i).click();

      // Verify filtered results
      await expect(page.locator('[data-testid="vibe-table-row"]')).toHaveCount(1);
    });

    test('bulk operations with Vibe Table selection', async ({ page }) => {
      await page.goto('/demo/vibe-board');

      // Select multiple items using Vibe Checkbox
      await page.locator('[data-testid="vibe-checkbox"]').first().click();
      await page.locator('[data-testid="vibe-checkbox"]').nth(1).click();

      // Verify bulk actions appear
      await expect(page.getByText(/selected/i)).toBeVisible();

      // Perform bulk delete
      await page.getByText(/delete selected/i).click();

      // Confirm in Vibe Modal
      await expect(page.locator('[data-testid="vibe-modal"]')).toBeVisible();
      await page.getByText(/confirm/i).click();

      // Verify success toast
      await expect(page.locator('[data-testid="vibe-toast"]')).toHaveAttribute('data-type', 'positive');
    });
  });

  test.describe('Theme Switching Journey', () => {
    test('switch themes using Vibe ThemeSwitcher', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.locator('[data-testid="vibe-textfield"]').first().fill('demo@example.com');
      await page.locator('[data-testid="vibe-textfield"]').nth(1).fill('Password123!');
      await page.locator('[data-testid="vibe-button"]').click();
      await page.waitForURL('/dashboard');

      // Open user menu
      await page.locator('[data-testid="vibe-avatar"]').click();

      // Find theme switcher
      await expect(page.getByText(/theme/i)).toBeVisible();

      // Switch to dark theme
      await page.locator('[data-testid="vibe-button"]').filter({ hasText: /theme/i }).click();

      // Verify dark theme is applied
      await expect(page.locator('body')).toHaveClass(/dark-app-theme/);

      // Switch back to light theme
      await page.locator('[data-testid="vibe-button"]').filter({ hasText: /theme/i }).click();

      // Verify light theme is applied
      await expect(page.locator('body')).toHaveClass(/light-app-theme/);
    });
  });

  test.describe('Workspace Navigation with Vibe Components', () => {
    test.beforeEach(async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.locator('[data-testid="vibe-textfield"]').first().fill('demo@example.com');
      await page.locator('[data-testid="vibe-textfield"]').nth(1).fill('Password123!');
      await page.locator('[data-testid="vibe-button"]').click();
      await page.waitForURL('/dashboard');
    });

    test('navigate workspaces using Vibe Menu components', async ({ page }) => {
      // Verify Vibe Menu is loaded
      await expect(page.locator('[data-testid="vibe-menu"]')).toBeVisible();

      // Navigate using Vibe MenuItem
      await page.locator('[data-testid="vibe-menu-item"]').first().click();

      // Verify navigation
      await expect(page.locator('[data-testid="vibe-menu-item"]').first()).toHaveClass(/selected/);
    });

    test('create workspace using Vibe Modal', async ({ page }) => {
      // Open create workspace modal
      await page.getByText(/create workspace/i).click();

      // Verify Vibe Modal opens
      await expect(page.locator('[data-testid="vibe-modal"]')).toBeVisible();

      // Fill workspace form
      await page.locator('[data-testid="vibe-textfield"]').fill('New Workspace');

      // Create workspace
      await page.getByText(/create/i).click();

      // Verify success
      await expect(page.locator('[data-testid="vibe-toast"]')).toHaveAttribute('data-type', 'positive');
    });
  });

  test.describe('Accessibility Journey', () => {
    test('keyboard navigation works with Vibe components', async ({ page }) => {
      await page.goto('/login');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="vibe-textfield"]').first()).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="vibe-textfield"]').nth(1)).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="vibe-button"]')).toBeFocused();

      // Submit with Enter key
      await page.keyboard.press('Enter');
    });

    test('screen reader compatibility with Vibe components', async ({ page }) => {
      await page.goto('/login');

      // Verify ARIA labels are present
      await expect(page.locator('[data-testid="vibe-textfield"]').first()).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="vibe-button"]')).toHaveAttribute('aria-label');

      // Verify form validation errors have proper ARIA
      await page.locator('[data-testid="vibe-button"]').click();
      await expect(page.locator('[data-testid="vibe-textfield"]').first()).toHaveAttribute('aria-describedby');
    });
  });

  test.describe('Performance Journey', () => {
    test('Vibe components load within performance budget', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/demo/vibe-table');

      // Wait for Vibe Table to load
      await expect(page.locator('[data-testid="vibe-table"]')).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('large datasets render efficiently with Vibe Table', async ({ page }) => {
      await page.goto('/demo/vibe-table');

      // Verify table handles large datasets
      await expect(page.locator('[data-testid="vibe-table-row"]')).toHaveCount(10, { timeout: 5000 });

      // Scroll performance test
      await page.locator('[data-testid="vibe-table"]').hover();
      await page.mouse.wheel(0, 1000);

      // Should remain responsive
      await expect(page.locator('[data-testid="vibe-table"]')).toBeVisible();
    });
  });

  test.describe('Error Handling Journey', () => {
    test('handles network errors gracefully with Vibe Toast', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());

      await page.goto('/login');
      await page.locator('[data-testid="vibe-textfield"]').first().fill('test@example.com');
      await page.locator('[data-testid="vibe-textfield"]').nth(1).fill('password');
      await page.locator('[data-testid="vibe-button"]').click();

      // Should show error toast
      await expect(page.locator('[data-testid="vibe-toast"]')).toHaveAttribute('data-type', 'negative');
    });

    test('shows loading states during API calls', async ({ page }) => {
      // Delay API responses
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      await page.goto('/login');
      await page.locator('[data-testid="vibe-textfield"]').first().fill('demo@example.com');
      await page.locator('[data-testid="vibe-textfield"]').nth(1).fill('Password123!');
      await page.locator('[data-testid="vibe-button"]').click();

      // Should show loading state
      await expect(page.locator('[data-testid="vibe-button"]')).toHaveAttribute('data-loading', 'true');
    });
  });

  test.describe('Mobile Responsiveness Journey', () => {
    test('Vibe components work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/login');

      // Verify components are responsive
      await expect(page.locator('[data-testid="vibe-textfield"]')).toBeVisible();
      await expect(page.locator('[data-testid="vibe-button"]')).toBeVisible();

      // Test touch interactions
      await page.locator('[data-testid="vibe-textfield"]').first().tap();
      await page.locator('[data-testid="vibe-textfield"]').first().fill('mobile@test.com');

      await page.locator('[data-testid="vibe-button"]').tap();
    });

    test('Vibe Table adapts to mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Login first
      await page.goto('/login');
      await page.locator('[data-testid="vibe-textfield"]').first().fill('demo@example.com');
      await page.locator('[data-testid="vibe-textfield"]').nth(1).fill('Password123!');
      await page.locator('[data-testid="vibe-button"]').click();

      await page.goto('/demo/vibe-table');

      // Verify table is responsive
      await expect(page.locator('[data-testid="vibe-table"]')).toBeVisible();

      // Test horizontal scrolling on mobile
      await page.locator('[data-testid="vibe-table"]').hover();
      await page.mouse.wheel(100, 0);
    });
  });
});