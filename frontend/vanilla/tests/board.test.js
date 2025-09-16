import { test, expect } from '@playwright/test';

test('should load board page and verify basic elements', async ({ page }) => {
  // Navigate to the board page
  await page.goto('http://localhost:3001/board.html');
  
  // Verify the page loaded successfully
  await expect(page).toHaveTitle(/Project Management System/);
  
  // Check for key elements that should be present on the board page
  const heading = await page.locator('h1');
  await expect(heading).toBeVisible();
  await expect(heading).toContainText('Project Management System');
  
  // Check if the main board container exists
  await expect(page.locator('#board-container')).toBeVisible();
  
  // Check if the task input form exists
  await expect(page.locator('#task-form')).toBeVisible();
  
  // Check if the task list container exists
  await expect(page.locator('#task-list')).toBeVisible();
  
  console.log('Board page loaded successfully and key elements are present');
});

test('should be able to add a new task', async ({ page }) => {
  // Navigate to the board page
  await page.goto('http://localhost:3001/board.html');
  
  // Wait for the page to load and JavaScript to initialize
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Additional wait for JavaScript initialization
  
  // Fill in the task form
  await page.fill('#task-title', 'Test Task');
  await page.fill('#task-description', 'This is a test task description');
  await page.selectOption('#task-priority', 'medium');
  
  // Submit the form
  await page.click('#add-task-btn');
  
  // Wait for the task to be added
  await page.waitForTimeout(500);
  
  // Verify the task was added to the list
  const taskItems = await page.locator('.task-item');
  await expect(taskItems).toHaveCount(1);
  
  const taskTitle = await page.locator('.task-title');
  await expect(taskTitle).toContainText('Test Task');
  
  console.log('Task added successfully');
});

test('should be able to mark task as completed', async ({ page }) => {
  // Navigate to the board page
  await page.goto('http://localhost:3001/board.html');
  
  // Wait for the page to load and JavaScript to initialize
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Additional wait for JavaScript initialization
  
  // Add a task first
  await page.fill('#task-title', 'Completion Test Task');
  await page.fill('#task-description', 'Task to test completion');
  await page.selectOption('#task-priority', 'high');
  await page.click('#add-task-btn');
  
  // Wait for the task to be added
  await page.waitForTimeout(500);
  
  // Mark the task as completed
  await page.click('.task-item .complete-btn');
  
  // Wait for the completion to register
  await page.waitForTimeout(500);
  
  // Verify the task is marked as completed
  await expect(page.locator('.task-item.completed')).toHaveCount(1);
  
  console.log('Task marked as completed successfully');
});

test('should be able to delete a task', async ({ page }) => {
  // Navigate to the board page
  await page.goto('http://localhost:3001/board.html');
  
  // Wait for the page to load and JavaScript to initialize
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Additional wait for JavaScript initialization
  
  // Add a task first
  await page.fill('#task-title', 'Deletion Test Task');
  await page.fill('#task-description', 'Task to test deletion');
  await page.selectOption('#task-priority', 'low');
  await page.click('#add-task-btn');
  
  // Wait for the task to be added
  await page.waitForTimeout(500);
  
  // Verify the task was added
  await expect(page.locator('.task-item')).toHaveCount(1);
  
  // Delete the task
  await page.click('.task-item .delete-btn');
  
  // Wait for the deletion to register
  await page.waitForTimeout(500);
  
  // Verify the task is deleted
  await expect(page.locator('.task-item')).toHaveCount(0);
  
  console.log('Task deleted successfully');
});