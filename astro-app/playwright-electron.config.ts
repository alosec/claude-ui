import { defineConfig, devices } from '@playwright/test';
import { _electron as electron } from 'playwright';

/**
 * Playwright configuration for Electron app testing
 * @see https://playwright.dev/docs/api/class-electron
 */
export default defineConfig({
  testDir: './tests/electron',
  timeout: 60000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false, // Electron tests should run serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Electron tests
  reporter: 'html',
  
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'electron',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
  ],
});