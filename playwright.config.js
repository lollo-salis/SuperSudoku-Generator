import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

process.env.PLAYWRIGHT_BROWSERS_PATH = fileURLToPath(new URL('./.cache/browsers', import.meta.url));
const temp = fileURLToPath(new URL('./.cache/browser-temp', import.meta.url));
mkdirSync(temp, { recursive: true });
process.env.TEMP = process.env.TMP = temp;

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1080 } } },
    { name: 'phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: { command: 'node server.js', url: 'http://127.0.0.1:5173', reuseExistingServer: false, timeout: 15000 },
});
