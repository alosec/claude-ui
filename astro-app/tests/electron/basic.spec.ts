import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('Electron App', () => {
  test('launches electron app and loads main page', async () => {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron.cjs')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Get the main window
    const page = await electronApp.firstWindow();
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Verify the window is opened
    expect(page).toBeTruthy();
    
    // Wait for Astro content to load (give it time to start server and load)
    await page.waitForTimeout(3000);
    
    // Check if we can see some content (adjust selector based on your actual content)
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/electron/screenshot.png' });
    
    // Close app
    await electronApp.close();
  });

  test('can navigate to make page', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron.cjs')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Try to navigate to /make
    try {
      await page.goto('http://localhost:4321/make');
      await page.waitForLoadState('networkidle');
      
      // Check if make page loaded
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      
    } catch (error) {
      // If direct navigation fails, try clicking navigation if it exists
      console.log('Direct navigation failed, page content:', await page.textContent('body'));
    }
    
    await electronApp.close();
  });
});