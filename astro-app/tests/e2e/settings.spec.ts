import { test, expect } from '@playwright/test';
import { TestHelpers } from '../fixtures/helpers.js';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.navigateAndWaitForLoad(page, '/settings');
  });

  test('should display page title and header', async ({ page }) => {
    await expect(page).toHaveTitle('Claude UI - Settings');
    await expect(page.locator('h1')).toHaveText('Settings');
  });

  test('should show back link to dashboard', async ({ page }) => {
    const backLink = page.locator('.back-link');
    
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveText('← Back to Dashboard');
    await expect(backLink).toHaveAttribute('href', '/make');
  });

  test('should navigate back to dashboard when back link is clicked', async ({ page }) => {
    const backLink = page.locator('.back-link');
    
    await backLink.click();
    await expect(page).toHaveURL('/make');
  });

  test('should display workspace path setting', async ({ page }) => {
    const settingGroup = page.locator('.setting-group');
    const label = page.locator('.setting-label');
    const description = page.locator('.setting-description');
    const currentValue = page.locator('.current-value');
    const input = page.locator('.setting-input');
    
    await expect(settingGroup).toBeVisible();
    await expect(label).toHaveText('Workspace Path');
    await expect(description).toContainText('Directory where your projects are located');
    await expect(currentValue).toBeVisible();
    await expect(input).toBeVisible();
  });

  test('should show current workspace path', async ({ page }) => {
    const currentValue = page.locator('.current-value');
    const inputValue = page.locator('.setting-input');
    
    await expect(currentValue).toContainText('Current:');
    
    // Should show some path (either default or env var)
    const currentText = await currentValue.textContent();
    expect(currentText).toMatch(/Current:\s+\//); // Should start with a path
    
    // Input should have the same value
    const inputVal = await inputValue.inputValue();
    expect(inputVal.length).toBeGreaterThan(0);
    expect(inputVal.startsWith('/')).toBe(true);
  });

  test('should allow editing workspace path input', async ({ page }) => {
    const input = page.locator('.setting-input');
    
    await input.clear();
    await input.fill('/test/workspace/path');
    
    await expect(input).toHaveValue('/test/workspace/path');
  });

  test('should show save button with proper styling', async ({ page }) => {
    const saveButton = page.locator('.save-button');
    
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toHaveText('Save Settings');
    await expect(saveButton).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect(saveButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('should show alert when save button is clicked', async ({ page }) => {
    const saveButton = page.locator('.save-button');
    
    // Listen for dialog
    page.on('dialog', dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Settings functionality not yet implemented');
      dialog.accept();
    });
    
    await saveButton.click();
  });

  test('should have proper form styling', async ({ page }) => {
    const input = page.locator('.setting-input');
    const settingGroup = page.locator('.setting-group');
    const label = page.locator('.setting-label');
    
    // Input styling
    await expect(input).toHaveCSS('border-width', '2px');
    await expect(input).toHaveCSS('border-color', 'rgb(0, 0, 0)');
    await expect(input).toHaveCSS('font-family', 'monospace');
    
    // Setting group styling
    await expect(settingGroup).toHaveCSS('border', '1px solid rgb(0, 0, 0)');
    
    // Label styling  
    await expect(label).toHaveCSS('font-weight', '600');
  });

  test('should have responsive container layout', async ({ page }) => {
    const container = page.locator('.container');
    const header = page.locator('.header');
    
    await expect(container).toHaveCSS('max-width', '600px');
    await expect(header).toHaveCSS('border-bottom-width', '2px');
    await expect(header).toHaveCSS('border-bottom-color', 'rgb(0, 0, 0)');
  });

  test('should show current value with proper monospace styling', async ({ page }) => {
    const currentValue = page.locator('.current-value');
    
    await expect(currentValue).toHaveCSS('font-family', 'monospace');
    await expect(currentValue).toHaveCSS('background-color', 'rgb(245, 245, 245)');
    await expect(currentValue).toHaveCSS('border-left-width', '3px');
    await expect(currentValue).toHaveCSS('border-left-color', 'rgb(0, 0, 0)');
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab to back link
    await page.keyboard.press('Tab');
    await expect(page.locator('.back-link')).toBeFocused();
    
    // Tab to input
    await page.keyboard.press('Tab');
    await expect(page.locator('.setting-input')).toBeFocused();
    
    // Tab to save button
    await page.keyboard.press('Tab');
    await expect(page.locator('.save-button')).toBeFocused();
  });

  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();
    
    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
  });

  test('should maintain black and white design', async ({ page }) => {
    const body = page.locator('body');
    const header = page.locator('.header h1');
    const description = page.locator('.setting-description');
    
    await expect(body).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(body).toHaveCSS('color', 'rgb(0, 0, 0)');
    await expect(header).toHaveCSS('color', 'rgb(0, 0, 0)');
    await expect(description).toHaveCSS('color', 'rgb(102, 102, 102)');
  });

  test('should have proper input focus styling', async ({ page }) => {
    const input = page.locator('.setting-input');
    
    await input.focus();
    await expect(input).toHaveCSS('background-color', 'rgb(245, 245, 245)');
  });

  test('should validate input accessibility', async ({ page }) => {
    const label = page.locator('.setting-label');
    const input = page.locator('.setting-input');
    
    // Label should be associated with input (in this case through visual grouping)
    await expect(label).toBeVisible();
    await expect(input).toBeVisible();
    
    // Input should be editable
    await input.click();
    await expect(input).toBeFocused();
  });
});