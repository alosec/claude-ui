import { test, expect } from '@playwright/test';

test('homepage loads and displays projects table', async ({ page }) => {
  await page.goto('/');

  // Expect the page to have a proper title
  await expect(page).toHaveTitle(/Claude UI/);

  // Expect the projects table to be present
  await expect(page.locator('table')).toBeVisible();
  await expect(page.locator('th').first()).toContainText('Project');
});

test('can navigate to project view', async ({ page }) => {
  await page.goto('/');
  
  // Wait for projects to load and click first project if available
  const firstProject = page.locator('tbody tr').first();
  if (await firstProject.isVisible()) {
    await firstProject.click();
    
    // Should navigate to project page
    await expect(page.url()).toMatch(/\/project\/.+/);
    await expect(page.locator('h1')).toBeVisible();
  }
});