import { test, expect } from '@playwright/test';
import { TestHelpers } from '../fixtures/helpers.js';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.navigateAndWaitForLoad(page, '/make');
  });

  test('should display page title and basic structure', async ({ page }) => {
    await expect(page).toHaveTitle('Claude UI - Dashboard');
    
    // Check for main elements
    await expect(page.locator('h1')).toHaveCount(0); // No h1 on this page based on implementation
    await expect(page.locator('.create-button')).toBeVisible();
    await expect(page.locator('.projects-list')).toBeVisible();
  });

  test('should show create button with plus sign', async ({ page }) => {
    const createButton = page.locator('.create-button');
    
    await expect(createButton).toBeVisible();
    await expect(createButton).toHaveText('+ Create');
    await expect(createButton.locator('.plus-sign')).toHaveText('+');
    
    // Check styling
    await expect(createButton).toHaveCSS('border', '2px solid rgb(0, 0, 0)');
    await expect(createButton).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });

  test('should navigate to create page when create button is clicked', async ({ page }) => {
    const createButton = page.locator('.create-button');
    
    await createButton.click();
    
    // Should navigate to /create (even though we haven't implemented this page yet)
    await expect(page).toHaveURL('/create');
  });

  test('should display projects from workspace', async ({ page }) => {
    const projectsList = page.locator('.projects-list');
    await expect(projectsList).toBeVisible();
    
    // Should show some projects or empty state
    const projectItems = page.locator('.project-item');
    const emptyState = page.locator('.empty-state');
    
    // Either projects exist or empty state is shown
    const hasProjects = await projectItems.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;
    
    expect(hasProjects || hasEmptyState).toBe(true);
  });

  test('should show project list with dashes', async ({ page }) => {
    const projectItems = page.locator('.project-item');
    const count = await projectItems.count();
    
    if (count > 0) {
      // Check that items have the dash prefix
      for (let i = 0; i < Math.min(count, 5); i++) {
        const item = projectItems.nth(i);
        const beforeContent = await item.evaluate(el => 
          window.getComputedStyle(el, '::before').getPropertyValue('content')
        );
        expect(beforeContent).toContain('-');
      }
    }
  });

  test('should navigate to project page when project is clicked', async ({ page }) => {
    const projectItems = page.locator('.project-item');
    const count = await projectItems.count();
    
    if (count > 0) {
      const firstProject = projectItems.first();
      const projectName = await firstProject.textContent();
      
      await firstProject.click();
      
      // Should navigate to project page
      await expect(page).toHaveURL(`/project/${projectName}`);
    } else {
      // Skip test if no projects
      test.skip(count > 0, 'No projects available to test navigation');
    }
  });

  test('should have proper hover effects on projects', async ({ page }) => {
    const projectItems = page.locator('.project-item');
    const count = await projectItems.count();
    
    if (count > 0) {
      const firstProject = projectItems.first();
      
      // Hover and check background change
      await firstProject.hover();
      await expect(firstProject).toHaveCSS('background-color', 'rgb(245, 245, 245)');
    } else {
      test.skip(count > 0, 'No projects available to test hover effects');
    }
  });

  test('should handle empty workspace gracefully', async ({ page }) => {
    // This tests the current behavior - we might be showing projects from /home/alex/code
    const emptyState = page.locator('.empty-state');
    const projectItems = page.locator('.project-item');
    
    const hasEmptyState = await emptyState.count() > 0;
    const hasProjects = await projectItems.count() > 0;
    
    if (hasEmptyState) {
      await expect(emptyState).toContainText('No projects found');
      await expect(emptyState).toHaveCSS('color', 'rgb(102, 102, 102)');
      await expect(emptyState).toHaveCSS('font-style', 'italic');
    }
    
    // One or the other should be true
    expect(hasEmptyState || hasProjects).toBe(true);
  });

  test('should have proper responsive layout', async ({ page }) => {
    const container = page.locator('.container');
    const dashboard = page.locator('.dashboard');
    
    await expect(container).toHaveCSS('max-width', '800px');
    await expect(dashboard).toHaveCSS('margin-top', '160px'); // 10rem = 160px typically
    await expect(dashboard).toHaveCSS('text-align', 'center');
  });

  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/make');
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();
    
    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
  });

  test('should have proper black and white styling', async ({ page }) => {
    // Check body styling
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(body).toHaveCSS('color', 'rgb(0, 0, 0)');
    
    // Check create button styling
    const createButton = page.locator('.create-button');
    await expect(createButton).toHaveCSS('color', 'rgb(0, 0, 0)');
    await expect(createButton).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(createButton).toHaveCSS('border-color', 'rgb(0, 0, 0)');
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab to create button
    await page.keyboard.press('Tab');
    await expect(page.locator('.create-button')).toBeFocused();
    
    // Enter should trigger click
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/create');
  });
});