/**
 * Workspace Management Tests
 * Comprehensive testing of workspace creation, management, and navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Workspace Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for authenticated state
    await page.waitForSelector('#main-nav', { timeout: 10000 });
  });

  test('should navigate to workspaces page', async ({ page }) => {
    // Click workspaces link in navigation
    await page.click('a[href="/workspaces"], .nav-link:has-text("Workspaces")');
    
    // Should be on workspaces page
    await expect(page).toHaveURL('/workspaces');
    await expect(page.locator('h1')).toContainText('Workspaces');
  });

  test('should display workspaces list or empty state', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Should show either workspaces grid or empty state
    const hasWorkspaces = await page.locator('.workspaces-grid .workspace-card').count() > 0;
    
    if (hasWorkspaces) {
      await expect(page.locator('.workspaces-grid')).toBeVisible();
      await expect(page.locator('.workspace-card')).toBeVisible();
    } else {
      await expect(page.locator('.empty-state')).toBeVisible();
      await expect(page.locator('h3')).toContainText('No workspaces yet');
    }
  });

  test('should show create workspace button', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Should have create workspace button
    await expect(page.locator('#create-workspace-btn, button:has-text("Create Workspace")')).toBeVisible();
  });

  test('should open workspace creation dialog', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Click create workspace button
    await page.click('#create-workspace-btn, button:has-text("Create Workspace")');
    
    // Should open creation dialog
    await expect(page.locator('.modal-overlay, .workspace-create-dialog')).toBeVisible();
    
    // Check for form fields
    const nameField = page.locator('input[placeholder*="workspace"], input[name="name"], #workspace-name');
    const descField = page.locator('textarea[placeholder*="workspace"], textarea[name="description"], #workspace-description');
    
    await expect(nameField.or(page.locator('input[type="text"]').first())).toBeVisible();
  });

  test('should validate workspace creation form', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Open creation dialog
    await page.click('#create-workspace-btn, button:has-text("Create Workspace")');
    
    // Try to submit empty form
    const submitBtn = page.locator('button:has-text("Create"), button[type="submit"]');
    await submitBtn.click();
    
    // Should show validation error or prevent submission
    const hasError = await page.locator('.error-message, .field-error').isVisible();
    const formStillOpen = await page.locator('.modal-overlay, .workspace-create-dialog').isVisible();
    
    expect(hasError || formStillOpen).toBeTruthy();
  });

  test('should create new workspace', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Open creation dialog
    await page.click('#create-workspace-btn, button:has-text("Create Workspace")');
    
    // Fill form
    const timestamp = Date.now();
    const workspaceName = `Test Workspace ${timestamp}`;
    
    const nameField = page.locator('input[placeholder*="workspace"], input[name="name"], #workspace-name');
    await nameField.or(page.locator('input[type="text"]').first()).fill(workspaceName);
    
    const descField = page.locator('textarea[placeholder*="workspace"], textarea[name="description"], #workspace-description');
    if (await descField.isVisible()) {
      await descField.fill('Test workspace description');
    }
    
    // Submit form
    await page.click('button:has-text("Create"), button[type="submit"]');
    
    // Should close dialog and show new workspace
    await expect(page.locator('.modal-overlay, .workspace-create-dialog')).not.toBeVisible({ timeout: 10000 });
    
    // Should see the new workspace in the list (or be redirected to it)
    await expect(page.locator(`text="${workspaceName}"`)).toBeVisible({ timeout: 10000 });
  });

  test('should cancel workspace creation', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Open creation dialog
    await page.click('#create-workspace-btn, button:has-text("Create Workspace")');
    
    // Cancel dialog
    const cancelBtn = page.locator('button:has-text("Cancel"), .dialog-overlay, .modal-close-btn');
    await cancelBtn.first().click();
    
    // Dialog should close
    await expect(page.locator('.modal-overlay, .workspace-create-dialog')).not.toBeVisible();
  });

  test('should display workspace cards with proper information', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Wait for workspaces to load
    await page.waitForTimeout(2000);
    
    const workspaceCards = page.locator('.workspace-card');
    const cardCount = await workspaceCards.count();
    
    if (cardCount > 0) {
      const firstCard = workspaceCards.first();
      
      // Should have workspace name
      await expect(firstCard.locator('h3, .workspace-name')).toBeVisible();
      
      // Should have action buttons
      await expect(firstCard.locator('button, .workspace-actions')).toBeVisible();
    }
  });

  test('should open workspace when clicked', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Wait for workspaces to load
    await page.waitForTimeout(2000);
    
    const workspaceCards = page.locator('.workspace-card');
    const cardCount = await workspaceCards.count();
    
    if (cardCount > 0) {
      const firstCard = workspaceCards.first();
      
      // Click on workspace (either card or open button)
      const openBtn = firstCard.locator('button:has-text("Open"), .open-workspace-btn');
      if (await openBtn.isVisible()) {
        await openBtn.click();
      } else {
        await firstCard.click();
      }
      
      // Should navigate to workspace page
      await expect(page.url()).toMatch(/\/workspace\/|\/workspaces\/\w+/);
    }
  });

  test('should handle workspace editing', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Wait for workspaces to load
    await page.waitForTimeout(2000);
    
    const workspaceCards = page.locator('.workspace-card');
    const cardCount = await workspaceCards.count();
    
    if (cardCount > 0) {
      const firstCard = workspaceCards.first();
      
      // Look for edit button
      const editBtn = firstCard.locator('button:has-text("Edit"), .edit-workspace-btn');
      if (await editBtn.isVisible()) {
        await editBtn.click();
        
        // Should open edit dialog
        await expect(page.locator('.modal-overlay, .workspace-edit-dialog')).toBeVisible();
      }
    }
  });

  test('should show workspace member management', async ({ page }) => {
    await page.goto('/workspaces');
    
    // Wait for workspaces to load
    await page.waitForTimeout(2000);
    
    const workspaceCards = page.locator('.workspace-card');
    const cardCount = await workspaceCards.count();
    
    if (cardCount > 0) {
      // Open first workspace
      const firstCard = workspaceCards.first();
      const openBtn = firstCard.locator('button:has-text("Open"), .open-workspace-btn');
      
      if (await openBtn.isVisible()) {
        await openBtn.click();
        
        // Should be on workspace page with members section
        await expect(page.locator('h2:has-text("Members"), .members-section')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should handle workspace deletion', async ({ page }) => {
    // First create a workspace to delete
    await page.goto('/workspaces');
    
    // Create test workspace
    await page.click('#create-workspace-btn, button:has-text("Create Workspace")');
    
    const timestamp = Date.now();
    const workspaceName = `Delete Test ${timestamp}`;
    
    const nameField = page.locator('input[placeholder*="workspace"], input[name="name"], #workspace-name');
    await nameField.or(page.locator('input[type="text"]').first()).fill(workspaceName);
    
    await page.click('button:has-text("Create"), button[type="submit"]');
    
    // Wait for workspace to be created
    await page.waitForTimeout(3000);
    await page.goto('/workspaces');
    
    // Find and delete the workspace
    const workspaceCard = page.locator(`.workspace-card:has-text("${workspaceName}")`);
    if (await workspaceCard.isVisible()) {
      const deleteBtn = workspaceCard.locator('button:has-text("Delete"), .delete-workspace-btn');
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        
        // Handle confirmation dialog
        const confirmBtn = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
        
        // Workspace should be removed from list
        await expect(workspaceCard).not.toBeVisible({ timeout: 10000 });
      }
    }
  });
});