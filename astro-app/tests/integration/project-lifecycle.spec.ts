import { test, expect } from '@playwright/test';
import { TestHelpers } from '../fixtures/helpers.js';

test.describe('Complete Project Lifecycle', () => {
  test('should complete full user journey from dashboard to project and back', async ({ page }) => {
    // Start at dashboard
    await TestHelpers.navigateAndWaitForLoad(page, '/make');
    
    // Verify dashboard loads
    await expect(page).toHaveTitle('Claude UI - Dashboard');
    await expect(page.locator('.create-button')).toBeVisible();
    await expect(page.locator('.projects-list')).toBeVisible();
    
    // Check if projects exist
    const projectItems = page.locator('.project-item');
    const projectCount = await projectItems.count();
    
    if (projectCount > 0) {
      // Get first project name and navigate to it
      const firstProject = projectItems.first();
      const projectName = await firstProject.textContent();
      
      await firstProject.click();
      
      // Should be on project page
      await expect(page).toHaveURL(`/project/${projectName}`);
      await expect(page.locator('h1')).toHaveText(projectName);
      
      // Wait for file tree to load
      await page.waitForResponse(response => 
        response.url().includes('/api/project-tree.json'),
        { timeout: 10000 }
      );
      
      // Verify project structure loads
      await expect(page.locator('.file-tree')).toBeVisible();
      await expect(page.locator('.content-area')).toBeVisible();
      await expect(page.locator('#tree-content')).not.toHaveText('Loading project structure...');
      
      // Navigate back to dashboard
      const backLink = page.locator('.back-link');
      await backLink.click();
      
      // Should be back on dashboard
      await expect(page).toHaveURL('/make');
      await expect(page.locator('.create-button')).toBeVisible();
    } else {
      // Test with empty state
      const emptyState = page.locator('.empty-state');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('No projects found');
    }
  });

  test('should handle navigation to settings and back', async ({ page }) => {
    // Start at dashboard
    await TestHelpers.navigateAndWaitForLoad(page, '/make');
    
    // Navigate to settings (manually, since there's no direct link yet)
    await page.goto('/settings');
    
    // Verify settings page
    await expect(page).toHaveTitle('Claude UI - Settings');
    await expect(page.locator('h1')).toHaveText('Settings');
    await expect(page.locator('.setting-input')).toBeVisible();
    
    // Navigate back to dashboard
    const backLink = page.locator('.back-link');
    await backLink.click();
    
    // Should be back on dashboard
    await expect(page).toHaveURL('/make');
    await expect(page.locator('.create-button')).toBeVisible();
  });

  test('should handle multiple project navigation', async ({ page }) => {
    // Start at dashboard
    await TestHelpers.navigateAndWaitForLoad(page, '/make');
    
    const projectItems = page.locator('.project-item');
    const projectCount = await projectItems.count();
    
    if (projectCount >= 2) {
      // Navigate to first project
      const firstProject = projectItems.first();
      const firstName = await firstProject.textContent();
      await firstProject.click();
      
      await expect(page).toHaveURL(`/project/${firstName}`);
      
      // Go back to dashboard
      await page.locator('.back-link').click();
      await expect(page).toHaveURL('/make');
      
      // Navigate to second project
      const secondProject = projectItems.nth(1);
      const secondName = await secondProject.textContent();
      await secondProject.click();
      
      await expect(page).toHaveURL(`/project/${secondName}`);
      
      // Verify it's a different project
      expect(firstName).not.toBe(secondName);
    } else {
      test.skip(projectCount >= 2, 'Need at least 2 projects for this test');
    }
  });

  test('should maintain state during navigation', async ({ page }) => {
    // Start at dashboard
    await TestHelpers.navigateAndWaitForLoad(page, '/make');
    
    // Navigate to settings
    await page.goto('/settings');
    
    // Modify input value
    const input = page.locator('.setting-input');
    await input.clear();
    await input.fill('/custom/test/path');
    
    // Navigate to dashboard
    await page.locator('.back-link').click();
    
    // Navigate back to settings
    await page.goto('/settings');
    
    // Input should be reset (since we don't have persistence)
    const inputValue = await page.locator('.setting-input').inputValue();
    expect(inputValue).not.toBe('/custom/test/path');
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Start at dashboard
    await TestHelpers.navigateAndWaitForLoad(page, '/make');
    
    const projectItems = page.locator('.project-item');
    const projectCount = await projectItems.count();
    
    if (projectCount > 0) {
      const projectName = await projectItems.first().textContent();
      
      // Navigate to project
      await projectItems.first().click();
      await expect(page).toHaveURL(`/project/${projectName}`);
      
      // Navigate to settings
      await page.goto('/settings');
      await expect(page).toHaveURL('/settings');
      
      // Use browser back button
      await page.goBack();
      await expect(page).toHaveURL(`/project/${projectName}`);
      
      // Use browser back button again
      await page.goBack();
      await expect(page).toHaveURL('/make');
      
      // Use browser forward button
      await page.goForward();
      await expect(page).toHaveURL(`/project/${projectName}`);
    } else {
      test.skip(projectCount > 0, 'Need projects for browser navigation test');
    }
  });

  test('should handle direct URL access to all pages', async ({ page }) => {
    // Direct access to dashboard
    await page.goto('/make');
    await expect(page.locator('.create-button')).toBeVisible();
    
    // Direct access to settings
    await page.goto('/settings');
    await expect(page.locator('h1')).toHaveText('Settings');
    
    // Direct access to project (using claude-ui which should exist)
    await page.goto('/project/claude-ui');
    // Should either load or show 404, not crash
    const response = await page.waitForLoadState('networkidle');
    // Page should have loaded something
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Start at a valid project page
    await page.goto('/project/claude-ui');
    
    // Intercept and fail API requests
    await page.route('**/api/project-tree.json*', route => {
      route.abort();
    });
    
    // Reload page
    await page.reload();
    
    // Tree content should handle the error
    const treeContent = page.locator('#tree-content');
    await page.waitForTimeout(3000); // Wait for API call to fail
    
    const content = await treeContent.textContent();
    expect(content).not.toBe('Loading project structure...');
    // Should show some error state or empty content
  });

  test('should maintain responsive design throughout navigation', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Dashboard should be responsive
    await page.goto('/make');
    const container = page.locator('.container');
    await expect(container).toHaveCSS('max-width', '800px');
    
    // Settings should be responsive
    await page.goto('/settings');
    const settingsContainer = page.locator('.container');
    await expect(settingsContainer).toHaveCSS('max-width', '600px');
    
    // Project page should be responsive
    await page.goto('/project/claude-ui');
    const projectContainer = page.locator('.container');
    await expect(projectContainer).toHaveCSS('max-width', '1200px');
  });

  test('should complete workflow within performance constraints', async ({ page }) => {
    const startTime = Date.now();
    
    // Complete user journey
    await TestHelpers.navigateAndWaitForLoad(page, '/make');
    
    const projectItems = page.locator('.project-item');
    const projectCount = await projectItems.count();
    
    if (projectCount > 0) {
      await projectItems.first().click();
      
      // Wait for project page to load completely
      await page.waitForResponse(response => 
        response.url().includes('/api/project-tree.json'),
        { timeout: 10000 }
      );
      
      await page.locator('.back-link').click();
      await page.goto('/settings');
      await page.locator('.back-link').click();
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Complete workflow should take less than 15 seconds
    expect(totalTime).toBeLessThan(15000);
  });

  test('should handle keyboard navigation throughout app', async ({ page }) => {
    await TestHelpers.navigateAndWaitForLoad(page, '/make');
    
    // Tab navigation on dashboard
    await page.keyboard.press('Tab');
    await expect(page.locator('.create-button')).toBeFocused();
    
    // Navigate to settings via URL (no keyboard nav implemented yet)
    await page.goto('/settings');
    
    // Tab navigation on settings
    await page.keyboard.press('Tab');
    await expect(page.locator('.back-link')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('.setting-input')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('.save-button')).toBeFocused();
  });

  test('should preserve black and white theme throughout navigation', async ({ page }) => {
    const pages = ['/make', '/settings', '/project/claude-ui'];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      const body = page.locator('body');
      await expect(body).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(body).toHaveCSS('color', 'rgb(0, 0, 0)');
    }
  });
});