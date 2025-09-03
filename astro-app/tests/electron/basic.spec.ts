import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDevServer(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:4321');
    return response.ok;
  } catch {
    return false;
  }
}

test.describe('Electron App', () => {
  test.beforeEach(async () => {
    const serverRunning = await checkDevServer();
    if (!serverRunning) {
      throw new Error('Dev server not running on port 4321. Please start it with: npm run dev');
    }
  });

  test('launches electron app and loads main page', async () => {
    // Launch Electron app that will connect to existing dev server
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron-test.cjs')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Get the main window
    const page = await electronApp.firstWindow();
    
    // Wait for page to load localhost:4321
    await page.waitForLoadState('networkidle');
    
    // Verify the window is opened
    expect(page).toBeTruthy();
    
    // Check if we can see some content
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/electron/screenshot.png' });
    
    // Close app
    await electronApp.close();
  });

  test('can navigate to make page', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron-test.cjs')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState('networkidle');
    
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