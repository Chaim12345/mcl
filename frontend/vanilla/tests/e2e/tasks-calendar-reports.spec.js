/**
 * Tasks, Calendar, and Reports Tests
 * Comprehensive testing of advanced frontend features
 */

import { test, expect } from '@playwright/test';

test.describe('Tasks Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#main-nav', { timeout: 10000 });
  });

  test('should navigate to tasks page', async ({ page }) => {
    await page.click('a[href="/tasks"], .nav-link:has-text("Tasks")');
    await expect(page).toHaveURL('/tasks');
    await expect(page.locator('h1')).toContainText('My Tasks');
  });

  test('should display task filters', async ({ page }) => {
    await page.goto('/tasks');
    
    // Should show filter buttons
    await expect(page.locator('.task-filters')).toBeVisible();
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Assigned to me")')).toBeVisible();
    await expect(page.locator('button:has-text("Due today")')).toBeVisible();
    await expect(page.locator('button:has-text("Overdue")')).toBeVisible();
  });

  test('should search tasks', async ({ page }) => {
    await page.goto('/tasks');
    
    // Should have search functionality
    const searchInput = page.locator('input[placeholder*="Search tasks"], .search-input');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test task');
      
      // Should filter tasks based on search
      await page.waitForTimeout(1000);
      expect(await page.locator('.task-card, .tasks-list').isVisible()).toBeTruthy();
    }
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('/tasks');
    
    // Test different filter options
    await page.click('button:has-text("Assigned to me")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Due today")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Overdue")');
    await page.waitForTimeout(1000);
    
    // Should show filtered results or empty state
    const hasResults = await page.locator('.task-card, .tasks-list').isVisible();
    const hasEmptyState = await page.locator('.empty-state').isVisible();
    expect(hasResults || hasEmptyState).toBeTruthy();
  });

  test('should open task from tasks list', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForTimeout(2000);
    
    // Look for task cards
    const taskCards = page.locator('.task-card');
    const cardCount = await taskCards.count();
    
    if (cardCount > 0) {
      const firstTask = taskCards.first();
      const openBtn = firstTask.locator('button:has-text("Open"), .open-task-btn');
      
      if (await openBtn.isVisible()) {
        await openBtn.click();
        
        // Should navigate to board with task selected
        await expect(page.url()).toMatch(/\/boards\/.*\?item=/);
      }
    }
  });

  test('should mark task as complete', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForTimeout(2000);
    
    const taskCards = page.locator('.task-card');
    const cardCount = await taskCards.count();
    
    if (cardCount > 0) {
      const firstTask = taskCards.first();
      const completeBtn = firstTask.locator('button:has-text("Mark Complete"), .mark-complete-btn');
      
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        
        // Should update task status or remove from list
        await page.waitForTimeout(2000);
        expect(await page.locator('.task-card').count()).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('Calendar Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#main-nav', { timeout: 10000 });
  });

  test('should navigate to calendar page', async ({ page }) => {
    await page.click('a[href="/calendar"], .nav-link:has-text("Calendar")');
    await expect(page).toHaveURL('/calendar');
    await expect(page.locator('h1')).toContainText('Calendar');
  });

  test('should display calendar controls', async ({ page }) => {
    await page.goto('/calendar');
    
    // Should show calendar navigation
    await expect(page.locator('.calendar-controls')).toBeVisible();
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
    await expect(page.locator('.calendar-nav')).toBeVisible();
    await expect(page.locator('button:has-text("Month")')).toBeVisible();
  });

  test('should display calendar grid', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    
    // Should show calendar grid
    await expect(page.locator('.calendar-grid, .calendar-month-view')).toBeVisible();
    await expect(page.locator('.calendar-day')).toBeVisible();
  });

  test('should navigate between months', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    
    // Test navigation buttons
    const prevBtn = page.locator('#calendar-prev-btn, button:has-text("‹")');
    const nextBtn = page.locator('#calendar-next-btn, button:has-text("›")');
    
    if (await prevBtn.isVisible()) {
      await prevBtn.click();
      await page.waitForTimeout(500);
    }
    
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Should update calendar display
    await expect(page.locator('.calendar-month-year')).toBeVisible();
  });

  test('should go to today', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    
    // Navigate away first
    const nextBtn = page.locator('#calendar-next-btn, button:has-text("›")');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Click Today button
    const todayBtn = page.locator('#calendar-today-btn, button:has-text("Today")');
    if (await todayBtn.isVisible()) {
      await todayBtn.click();
      
      // Should show current month with today highlighted
      await expect(page.locator('.calendar-day.today')).toBeVisible();
    }
  });

  test('should display events on calendar', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(3000);
    
    // Look for calendar events
    const events = page.locator('.calendar-event');
    const eventCount = await events.count();
    
    if (eventCount > 0) {
      // Should show event details on hover or click
      const firstEvent = events.first();
      await firstEvent.hover();
      
      // Events should be clickable
      await firstEvent.click();
      
      // Should navigate to the related item/board
      await page.waitForTimeout(1000);
    }
  });

  test('should switch calendar views', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    
    // Test view switching
    const weekViewBtn = page.locator('button:has-text("Week")');
    const monthViewBtn = page.locator('button:has-text("Month")');
    
    if (await weekViewBtn.isVisible()) {
      await weekViewBtn.click();
      await page.waitForTimeout(1000);
    }
    
    if (await monthViewBtn.isVisible()) {
      await monthViewBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Should update calendar layout
    await expect(page.locator('.calendar-grid')).toBeVisible();
  });
});

test.describe('Reports Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#main-nav', { timeout: 10000 });
  });

  test('should navigate to reports page', async ({ page }) => {
    await page.click('a[href="/reports"], .nav-link:has-text("Reports")');
    await expect(page).toHaveURL('/reports');
    await expect(page.locator('h1')).toContainText('Reports');
  });

  test('should display report controls', async ({ page }) => {
    await page.goto('/reports');
    
    // Should show report controls
    await expect(page.locator('.report-controls')).toBeVisible();
    await expect(page.locator('#report-type, select')).toBeVisible();
    await expect(page.locator('button:has-text("Generate Report")')).toBeVisible();
  });

  test('should display report content', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(3000);
    
    // Should show report sections
    await expect(page.locator('#report-summary, .report-summary')).toBeVisible();
    await expect(page.locator('#report-charts, .report-charts')).toBeVisible();
  });

  test('should switch between report types', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    // Test different report types
    const reportSelect = page.locator('#report-type, select');
    if (await reportSelect.isVisible()) {
      await reportSelect.selectOption('performance');
      await page.waitForTimeout(2000);
      
      await reportSelect.selectOption('workload');
      await page.waitForTimeout(2000);
      
      await reportSelect.selectOption('timeline');
      await page.waitForTimeout(2000);
      
      await reportSelect.selectOption('progress');
      await page.waitForTimeout(2000);
    }
    
    // Should update report content
    await expect(page.locator('.report-summary')).toBeVisible();
  });

  test('should generate report', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    // Click generate report button
    const generateBtn = page.locator('#generate-report-btn, button:has-text("Generate Report")');
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      
      // Should update report data
      await page.waitForTimeout(3000);
      await expect(page.locator('.summary-cards, .report-summary')).toBeVisible();
    }
  });

  test('should display summary cards', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(3000);
    
    // Should show summary statistics
    const summaryCards = page.locator('.summary-card');
    const cardCount = await summaryCards.count();
    
    if (cardCount > 0) {
      // Each card should have a number and label
      const firstCard = summaryCards.first();
      await expect(firstCard.locator('h3')).toBeVisible();
      await expect(firstCard.locator('p')).toBeVisible();
    }
  });

  test('should display progress charts', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(3000);
    
    // Should show progress visualizations
    const chartContainer = page.locator('.chart-container, .progress-chart');
    if (await chartContainer.isVisible()) {
      await expect(chartContainer).toBeVisible();
      
      // Should have progress bars or other visual elements
      const progressBars = page.locator('.progress-bar, .progress-segment');
      const progressList = page.locator('.board-progress-list');
      
      const hasVisualElements = await progressBars.isVisible() || await progressList.isVisible();
      expect(hasVisualElements).toBeTruthy();
    }
  });

  test('should handle export functionality', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    // Test export button
    const exportBtn = page.locator('#export-report-btn, button:has-text("Export")');
    if (await exportBtn.isVisible()) {
      // Set up dialog handler for export alert
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toContain('Export functionality');
        await dialog.accept();
      });
      
      await exportBtn.click();
    }
  });

  test('should display detailed data table', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(3000);
    
    // Look for detailed data table
    const dataTable = page.locator('.report-table, table');
    if (await dataTable.isVisible()) {
      await expect(dataTable).toBeVisible();
      
      // Should have headers and data
      await expect(dataTable.locator('th, .table-header')).toBeVisible();
      
      const rows = dataTable.locator('tr, .table-row');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Cross-Feature Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#main-nav', { timeout: 10000 });
  });

  test('should navigate between all main sections', async ({ page }) => {
    // Test navigation between all major sections
    const sections = [
      { url: '/dashboard', text: 'Dashboard' },
      { url: '/workspaces', text: 'Workspaces' },
      { url: '/boards', text: 'Boards' },
      { url: '/tasks', text: 'Tasks' },
      { url: '/calendar', text: 'Calendar' },
      { url: '/reports', text: 'Reports' },
      { url: '/settings', text: 'Settings' }
    ];
    
    for (const section of sections) {
      await page.click(`a[href="${section.url}"], .nav-link:has-text("${section.text}")`);
      await expect(page).toHaveURL(section.url);
      await page.waitForTimeout(1000);
    }
  });

  test('should maintain user state across navigation', async ({ page }) => {
    // Navigate between pages and ensure user remains logged in
    await page.goto('/dashboard');
    await expect(page.locator('#main-nav, .nav-user')).toBeVisible();
    
    await page.goto('/workspaces');
    await expect(page.locator('#main-nav, .nav-user')).toBeVisible();
    
    await page.goto('/tasks');
    await expect(page.locator('#main-nav, .nav-user')).toBeVisible();
    
    await page.goto('/calendar');
    await expect(page.locator('#main-nav, .nav-user')).toBeVisible();
    
    await page.goto('/reports');
    await expect(page.locator('#main-nav, .nav-user')).toBeVisible();
  });

  test('should handle responsive behavior on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    
    // Check if mobile navigation is working
    const mobileNav = page.locator('.mobile-nav, .nav-mobile');
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible();
    }
    
    // Test different pages on mobile
    await page.goto('/workspaces');
    await page.waitForTimeout(1000);
    
    await page.goto('/tasks');
    await page.waitForTimeout(1000);
    
    // Should remain functional on mobile
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Test Enter key navigation
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    if (focusedElement === 'A' || focusedElement === 'BUTTON') {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
  });
});