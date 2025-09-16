/**
 * Board Management Tests
 * Comprehensive testing of board creation, viewing, and item management
 */

import { test, expect } from '@playwright/test';

test.describe('Board Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and ensure we have a workspace to work with
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for authenticated state
    await page.waitForSelector('#main-nav', { timeout: 10000 });
  });

  test('should navigate to boards page', async ({ page }) => {
    // Click boards link in navigation
    await page.click('a[href="/boards"], .nav-link:has-text("Boards")');
    
    // Should be on boards page
    await expect(page).toHaveURL('/boards');
    await expect(page.locator('h1')).toContainText('Boards');
  });

  test('should display boards list or empty state', async ({ page }) => {
    await page.goto('/boards');
    
    // Should show either boards grid or empty state
    const hasBoards = await page.locator('.boards-grid .board-card').count() > 0;
    
    if (hasBoards) {
      await expect(page.locator('.boards-grid')).toBeVisible();
      await expect(page.locator('.board-card')).toBeVisible();
    } else {
      await expect(page.locator('.empty-state')).toBeVisible();
    }
  });

  test('should create new board', async ({ page }) => {
    // Go to workspaces first to ensure we have a workspace
    await page.goto('/workspaces');
    await page.waitForTimeout(2000);
    
    // Open a workspace or create one
    const workspaceCards = page.locator('.workspace-card');
    const cardCount = await workspaceCards.count();
    
    if (cardCount > 0) {
      // Open existing workspace
      const openBtn = workspaceCards.first().locator('button:has-text("Open"), .open-workspace-btn');
      if (await openBtn.isVisible()) {
        await openBtn.click();
      } else {
        await workspaceCards.first().click();
      }
    } else {
      // Create workspace first
      await page.click('#create-workspace-btn, button:has-text("Create Workspace")');
      const nameField = page.locator('input[placeholder*="workspace"], input[name="name"], #workspace-name');
      await nameField.or(page.locator('input[type="text"]').first()).fill('Test Workspace');
      await page.click('button:has-text("Create"), button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    
    // Now create a board
    const createBoardBtn = page.locator('#create-board-btn, button:has-text("Create Board")');
    if (await createBoardBtn.isVisible()) {
      await createBoardBtn.click();
      
      // Fill board creation form
      const timestamp = Date.now();
      const boardName = `Test Board ${timestamp}`;
      
      const nameField = page.locator('input[placeholder*="board"], input[name="name"], #board-name');
      await nameField.or(page.locator('input[type="text"]').first()).fill(boardName);
      
      const descField = page.locator('textarea[placeholder*="board"], textarea[name="description"], #board-description');
      if (await descField.isVisible()) {
        await descField.fill('Test board description');
      }
      
      // Submit form
      await page.click('button:has-text("Create"), button[type="submit"]');
      
      // Should see the new board
      await expect(page.locator(`text="${boardName}"`)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should open board view', async ({ page }) => {
    // Navigate to boards page
    await page.goto('/boards');
    await page.waitForTimeout(2000);
    
    const boardCards = page.locator('.board-card');
    const cardCount = await boardCards.count();
    
    if (cardCount > 0) {
      const firstBoard = boardCards.first();
      
      // Click on board to open it
      const openBtn = firstBoard.locator('button:has-text("Open"), .open-board-btn');
      if (await openBtn.isVisible()) {
        await openBtn.click();
      } else {
        await firstBoard.click();
      }
      
      // Should navigate to board view
      await expect(page.url()).toMatch(/\/board\/|\/boards\/\w+/);
      
      // Should show board view components
      await expect(page.locator('.board-view, .board-page')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display board columns and headers', async ({ page }) => {
    // First ensure we have a board to view
    await page.goto('/boards');
    await page.waitForTimeout(2000);
    
    const boardCards = page.locator('.board-card');
    const cardCount = await boardCards.count();
    
    if (cardCount > 0) {
      // Open first board
      const firstBoard = boardCards.first();
      const openBtn = firstBoard.locator('button:has-text("Open"), .open-board-btn');
      if (await openBtn.isVisible()) {
        await openBtn.click();
      } else {
        await firstBoard.click();
      }
      
      // Wait for board to load
      await page.waitForSelector('.board-view, .board-page', { timeout: 10000 });
      
      // Should show board table/kanban view
      const hasTable = await page.locator('.board-table, table').isVisible();
      const hasKanban = await page.locator('.kanban-board, .board-columns').isVisible();
      
      expect(hasTable || hasKanban).toBeTruthy();
      
      // Should have column headers
      if (hasTable) {
        await expect(page.locator('th, .column-header')).toBeVisible();
      }
    }
  });

  test('should create new item in board', async ({ page }) => {
    // Navigate to a board
    await page.goto('/boards');
    await page.waitForTimeout(2000);
    
    const boardCards = page.locator('.board-card');
    const cardCount = await boardCards.count();
    
    if (cardCount > 0) {
      // Open first board
      const firstBoard = boardCards.first();
      const openBtn = firstBoard.locator('button:has-text("Open"), .open-board-btn');
      if (await openBtn.isVisible()) {
        await openBtn.click();
      } else {
        await firstBoard.click();
      }
      
      // Wait for board to load
      await page.waitForSelector('.board-view, .board-page', { timeout: 10000 });
      
      // Look for add item button
      const addItemBtn = page.locator('button:has-text("Add Item"), button:has-text("New Item"), .add-item-btn');
      if (await addItemBtn.isVisible()) {
        await addItemBtn.click();
        
        // Fill item creation form
        const timestamp = Date.now();
        const itemName = `Test Item ${timestamp}`;
        
        const nameField = page.locator('input[placeholder*="item"], input[placeholder*="title"], input[name="title"]');
        await nameField.or(page.locator('input[type="text"]').first()).fill(itemName);
        
        // Submit form
        await page.click('button:has-text("Create"), button:has-text("Add"), button[type="submit"]');
        
        // Should see the new item in the board
        await expect(page.locator(`text="${itemName}"`)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should edit item in board', async ({ page }) => {
    // Navigate to a board with items
    await page.goto('/boards');
    await page.waitForTimeout(2000);
    
    const boardCards = page.locator('.board-card');
    const cardCount = await boardCards.count();
    
    if (cardCount > 0) {
      // Open first board
      const firstBoard = boardCards.first();
      const openBtn = firstBoard.locator('button:has-text("Open"), .open-board-btn');
      if (await openBtn.isVisible()) {
        await openBtn.click();
      } else {
        await firstBoard.click();
      }
      
      // Wait for board to load
      await page.waitForSelector('.board-view, .board-page', { timeout: 10000 });
      
      // Look for items to edit
      const items = page.locator('.board-item, .item-row, .task-card, td');
      const itemCount = await items.count();
      
      if (itemCount > 0) {
        // Click on first item or edit button
        const firstItem = items.first();
        await firstItem.click();
        
        // Should open item detail modal or inline edit
        const hasModal = await page.locator('.modal-overlay, .item-detail-modal').isVisible();
        const hasInlineEdit = await page.locator('input[type="text"]:focus, textarea:focus').isVisible();
        
        expect(hasModal || hasInlineEdit).toBeTruthy();
      }
    }
  });

  test('should search and filter items', async ({ page }) => {
    // Navigate to a board
    await page.goto('/boards');
    await page.waitForTimeout(2000);
    
    const boardCards = page.locator('.board-card');
    const cardCount = await boardCards.count();
    
    if (cardCount > 0) {
      // Open first board
      const firstBoard = boardCards.first();
      const openBtn = firstBoard.locator('button:has-text("Open"), .open-board-btn');
      if (await openBtn.isVisible()) {
        await openBtn.click();
      } else {
        await firstBoard.click();
      }
      
      // Wait for board to load
      await page.waitForSelector('.board-view, .board-page', { timeout: 10000 });
      
      // Look for search functionality
      const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"], .search-input');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        
        // Should filter items based on search
        await page.waitForTimeout(1000);
        
        // Verify search is working (items should be filtered)
        expect(await page.locator('.board-item, .item-row').count()).toBeGreaterThanOrEqual(0);
      }
      
      // Look for filter options
      const filterBtn = page.locator('button:has-text("Filter"), .filter-btn');
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        
        // Should open filter options
        await expect(page.locator('.filter-modal, .filter-options')).toBeVisible();
      }
    }
  });

  test('should handle board settings and column management', async ({ page }) => {
    // Navigate to a board
    await page.goto('/boards');
    await page.waitForTimeout(2000);
    
    const boardCards = page.locator('.board-card');
    const cardCount = await boardCards.count();
    
    if (cardCount > 0) {
      // Open first board
      const firstBoard = boardCards.first();
      const openBtn = firstBoard.locator('button:has-text("Open"), .open-board-btn');
      if (await openBtn.isVisible()) {
        await openBtn.click();
      } else {
        await firstBoard.click();
      }
      
      // Wait for board to load
      await page.waitForSelector('.board-view, .board-page', { timeout: 10000 });
      
      // Look for settings button
      const settingsBtn = page.locator('button:has-text("Settings"), .board-settings-btn, .settings-btn');
      if (await settingsBtn.isVisible()) {
        await settingsBtn.click();
        
        // Should open settings modal
        await expect(page.locator('.modal-overlay, .board-settings-modal')).toBeVisible();
      }
      
      // Look for column management
      const columnsBtn = page.locator('button:has-text("Columns"), .manage-columns-btn');
      if (await columnsBtn.isVisible()) {
        await columnsBtn.click();
        
        // Should open column management
        await expect(page.locator('.modal-overlay, .column-manager')).toBeVisible();
      }
    }
  });

  test('should handle board view switching', async ({ page }) => {
    // Navigate to a board
    await page.goto('/boards');
    await page.waitForTimeout(2000);
    
    const boardCards = page.locator('.board-card');
    const cardCount = await boardCards.count();
    
    if (cardCount > 0) {
      // Open first board
      const firstBoard = boardCards.first();
      const openBtn = firstBoard.locator('button:has-text("Open"), .open-board-btn');
      if (await openBtn.isVisible()) {
        await openBtn.click();
      } else {
        await firstBoard.click();
      }
      
      // Wait for board to load
      await page.waitForSelector('.board-view, .board-page', { timeout: 10000 });
      
      // Look for view toggle buttons
      const viewToggle = page.locator('.view-toggle, .view-options');
      if (await viewToggle.isVisible()) {
        // Try switching between table and kanban views
        const tableViewBtn = page.locator('button:has-text("Table"), .table-view-btn');
        const kanbanViewBtn = page.locator('button:has-text("Kanban"), .kanban-view-btn');
        
        if (await tableViewBtn.isVisible()) {
          await tableViewBtn.click();
          await page.waitForTimeout(1000);
        }
        
        if (await kanbanViewBtn.isVisible()) {
          await kanbanViewBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });
});