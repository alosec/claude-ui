import { test, expect } from '@playwright/test';
import { TestHelpers } from '../fixtures/helpers.js';

test.describe('Project Detail Page', () => {
  test('should show 404 for non-existent project', async ({ page }) => {
    const response = await page.goto('/project/non-existent-project-12345');
    expect(response?.status()).toBe(404);
  });

  test('should display project page for existing project', async ({ page }) => {
    // Test with a project that likely exists (claude-ui itself)
    await TestHelpers.navigateAndWaitForLoad(page, '/project/claude-ui');
    
    // Should not be 404
    expect(page.url()).toContain('/project/claude-ui');
    
    // Check basic structure
    await expect(page.locator('h1')).toHaveText('claude-ui');
    await expect(page.locator('.back-link')).toBeVisible();
    await expect(page.locator('.project-info')).toBeVisible();
    await expect(page.locator('.file-tree')).toBeVisible();
    await expect(page.locator('.content-area')).toBeVisible();
  });

  test('should show back link to dashboard', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    const backLink = page.locator('.back-link');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveText('← Back to Dashboard');
    await expect(backLink).toHaveAttribute('href', '/make');
  });

  test('should navigate back to dashboard when back link clicked', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    const backLink = page.locator('.back-link');
    await backLink.click();
    
    await expect(page).toHaveURL('/make');
  });

  test('should display project path information', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    const projectInfo = page.locator('.project-info');
    const projectPath = page.locator('.project-path');
    
    await expect(projectInfo).toBeVisible();
    await expect(projectPath).toBeVisible();
    
    const pathText = await projectPath.textContent();
    expect(pathText).toContain('claude-ui');
    expect(pathText).toMatch(/\/.*claude-ui/); // Should contain a path to claude-ui
  });

  test('should show file tree section', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    const fileTree = page.locator('.file-tree');
    const treeTitle = page.locator('.file-tree h3');
    const treeContent = page.locator('#tree-content');
    
    await expect(fileTree).toBeVisible();
    await expect(treeTitle).toHaveText('Project Structure');
    await expect(treeContent).toBeVisible();
  });

  test('should load project structure via API', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    // Wait for API call to complete
    const apiResponse = await page.waitForResponse(
      response => response.url().includes('/api/project-tree.json') && 
                  response.url().includes('project=claude-ui'),
      { timeout: 10000 }
    );
    
    expect(apiResponse.status()).toBe(200);
    
    // Tree content should no longer show loading
    const treeContent = page.locator('#tree-content');
    await expect(treeContent).not.toHaveText('Loading project structure...');
  });

  test('should display file tree items with proper styling', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    // Wait for tree to load
    await page.waitForResponse(response => 
      response.url().includes('/api/project-tree.json'),
      { timeout: 10000 }
    );
    
    // Wait for tree items to appear
    await page.waitForSelector('.tree-item', { timeout: 5000 });
    
    const treeItems = page.locator('.tree-item');
    const count = await treeItems.count();
    
    if (count > 0) {
      const firstItem = treeItems.first();
      await expect(firstItem).toBeVisible();
      
      // Check for proper CSS classes
      const className = await firstItem.getAttribute('class');
      expect(className).toContain('tree-item');
      expect(className).toMatch(/(directory|file)/);
    }
  });

  test('should show file and directory icons', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/project-tree.json'),
      { timeout: 10000 }
    );
    
    await page.waitForSelector('.tree-item', { timeout: 5000 });
    
    const treeItems = page.locator('.tree-item');
    const count = await treeItems.count();
    
    if (count > 0) {
      // Check that items have before pseudo-elements (icons)
      for (let i = 0; i < Math.min(count, 3); i++) {
        const item = treeItems.nth(i);
        const beforeContent = await item.evaluate(el => 
          window.getComputedStyle(el, '::before').getPropertyValue('content')
        );
        expect(beforeContent).toMatch(/📁|📄/); // Should have folder or file icon
      }
    }
  });

  test('should handle file clicks', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/project-tree.json'),
      { timeout: 10000 }
    );
    
    await page.waitForSelector('.tree-item.file', { timeout: 5000 });
    
    const fileItems = page.locator('.tree-item.file');
    const fileCount = await fileItems.count();
    
    if (fileCount > 0) {
      // Listen for console logs (current implementation just logs)
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });
      
      const firstFile = fileItems.first();
      await firstFile.click();
      
      // Should have logged the file click
      expect(consoleLogs.some(log => log.includes('File clicked:'))).toBe(true);
    }
  });

  test('should have proper two-column layout', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    const projectLayout = page.locator('.project-layout');
    const fileTree = page.locator('.file-tree');
    const contentArea = page.locator('.content-area');
    
    await expect(projectLayout).toHaveCSS('display', 'grid');
    await expect(projectLayout).toHaveCSS('grid-template-columns', '300px 1fr');
    
    await expect(fileTree).toBeVisible();
    await expect(contentArea).toBeVisible();
  });

  test('should show welcome content in content area', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    const contentArea = page.locator('.content-area');
    
    await expect(contentArea).toContainText('Welcome to claude-ui');
    await expect(contentArea).toContainText('Select a file from the project structure');
    await expect(contentArea).toContainText('Claude Code integration');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Test with a project name that might cause API errors
    await page.goto('/project/invalid-project-name-with-special-chars!@#');
    
    const treeContent = page.locator('#tree-content');
    
    // Should either show error or handle gracefully
    await page.waitForTimeout(3000); // Wait for API call to complete or fail
    
    const content = await treeContent.textContent();
    expect(content).not.toBe('Loading project structure...');
  });

  test('should have proper scrolling containers', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    const fileTree = page.locator('.file-tree');
    const contentArea = page.locator('.content-area');
    
    await expect(fileTree).toHaveCSS('overflow-y', 'auto');
    await expect(contentArea).toHaveCSS('overflow-y', 'auto');
  });

  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/project/claude-ui');
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();
    
    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(8000); // Should load in under 8 seconds (including API call)
  });

  test('should maintain black and white design', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    const body = page.locator('body');
    const header = page.locator('.header');
    const fileTree = page.locator('.file-tree');
    const contentArea = page.locator('.content-area');
    
    await expect(body).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(body).toHaveCSS('color', 'rgb(0, 0, 0)');
    
    await expect(fileTree).toHaveCSS('border', '2px solid rgb(0, 0, 0)');
    await expect(fileTree).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    
    await expect(contentArea).toHaveCSS('border', '2px solid rgb(0, 0, 0)');
    await expect(contentArea).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });

  test('should have keyboard navigation support', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    // Tab to back link
    await page.keyboard.press('Tab');
    await expect(page.locator('.back-link')).toBeFocused();
    
    // Should be able to activate with Enter
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/make');
  });

  test('should handle deep project structures', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    // Wait for API response
    const response = await TestHelpers.waitForApiResponse(page, 'project-tree.json');
    
    // Validate response structure
    await TestHelpers.validateProjectTreeResponse(response);
    
    // Should have reasonable depth (default is 3)
    expect(response.metadata.maxDepth).toBe(3);
  });

  test('should show project info styling', async ({ page }) => {
    await page.goto('/project/claude-ui');
    
    const projectInfo = page.locator('.project-info');
    const projectPath = page.locator('.project-path');
    
    await expect(projectInfo).toHaveCSS('background-color', 'rgb(245, 245, 245)');
    await expect(projectInfo).toHaveCSS('border-left-width', '3px');
    await expect(projectInfo).toHaveCSS('border-left-color', 'rgb(0, 0, 0)');
    
    await expect(projectPath).toHaveCSS('font-family', 'monospace');
    await expect(projectPath).toHaveCSS('color', 'rgb(102, 102, 102)');
  });
});