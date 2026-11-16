// Browsertests op computer en gsm. Zet CHROME_PATH als je een eigen Chrome wil gebruiken,
// anders gebruikt Playwright zijn eigen Chromium (npx playwright install chromium).
import { defineConfig, devices } from '@playwright/test';

const chrome = process.env.CHROME_PATH;

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: 'list',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: chrome ? { executablePath: chrome } : {}
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://localhost:4173',
    reuseExistingServer: true
  },
  projects: [
    { name: 'computer', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'gsm', use: { ...devices['Pixel 7'] } }
  ]
});
