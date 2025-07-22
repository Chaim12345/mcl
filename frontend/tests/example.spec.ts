
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Project Management Platform/);
});

test('has welcome message', async ({ page }) => {
  await page.goto('/');

  // Expects page to have a heading with the name of Welcome to the Project Management Platform.
  await expect(page.getByRole('heading', { name: 'Welcome to the Project Management Platform' })).toBeVisible();
});
