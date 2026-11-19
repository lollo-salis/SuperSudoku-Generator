import { test, expect } from '@playwright/test';

test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.addEventListener('beforeinstallprompt', event => { if (event.isTrusted) event.stopImmediatePropagation(); }, true));
  await page.goto('/');
  await expect(page.locator('[data-cell]')).toHaveCount(576);
  await page.locator('#language').selectOption('en');
});

test('Android gets Chrome instructions and a clear explanation of Netlify protection', async ({ page }) => {
  await page.route('**/manifest.webmanifest', route => route.fulfill({ status: 401, body: 'Login required' }));
  await page.locator('#install-button').click();
  await expect(page.locator('#install-platform-help')).toContainText('Chrome on Android');
  await expect(page.locator('#install-check')).toContainText('host requires a login');
  await expect(page.locator('#install-native')).not.toBeVisible();
  await page.unroute('**/manifest.webmanifest');
  await page.locator('#install-retry').click();
  await expect(page.locator('#install-check')).toContainText('required files are accessible');
});

test('a late Chrome prompt enables the guide action and is invoked once from user activation', async ({ page }, info) => {
  await page.locator('#install-button').click();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    Object.defineProperty(event, 'prompt', { value: () => {
      window.promptCalls = (window.promptCalls || 0) + 1;
      window.promptActivation = navigator.userActivation.isActive;
      return Promise.resolve({ outcome: 'accepted' });
    } });
    dispatchEvent(event);
  });
  await expect(page.locator('#install-native')).toBeVisible();
  if (info.project.name === 'phone') await page.locator('#install-native').tap();
  else await page.locator('#install-native').click();
  expect(await page.evaluate(() => window.promptCalls)).toBe(1);
  expect(await page.evaluate(() => window.promptActivation)).toBe(true);
  await page.evaluate(() => dispatchEvent(new Event('appinstalled')));
  await expect(page.locator('#install-button')).not.toBeVisible();
});

test('a rejected native prompt has a visible fallback without an unhandled error', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    Object.defineProperty(event, 'prompt', { value: () => Promise.reject(new Error('Prompt blocked')) });
    dispatchEvent(event);
  });
  await page.locator('#install-button').click();
  await expect(page.locator('#install-check')).toContainText('prompt did not open');
  await expect(page.locator('#install-button')).toBeEnabled();
  expect(errors).toEqual([]);
});
