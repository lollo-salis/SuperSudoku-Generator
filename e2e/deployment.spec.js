import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-cell]')).toHaveCount(576);
});

test('manifest icons load and installation instructions are available without a native prompt', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  expect((await request.get('/icons/apple-touch-icon.png')).ok()).toBe(true);
  await page.locator('#language').selectOption('en');
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    // A missing prompt tests the Safari/manual installation path.
    dispatchEvent(event);
  });
  await page.locator('#install-button').click();
  await expect(page.locator('#install-dialog')).toBeVisible();
  await expect(page.locator('#install-check')).toContainText('required files are accessible');
  await expect(page.locator('#install-dialog')).toContainText('Available offline');
});

test('offline mode reloads with a query string and generates a fresh puzzle without the server', async ({ page, context }) => {
  await expect(page.locator('#offline-status')).toContainText('offline');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  await context.setOffline(true);
  await page.goto('/?offline-check=1');
  await expect(page.locator('[data-cell]')).toHaveCount(576);
  await page.locator('#new-game').click();
  await page.locator('#seed').fill('offline-netlify-test');
  await page.locator('#generate-button').click();
  await expect(page.locator('#new-dialog')).not.toBeVisible({ timeout: 45000 });
  await expect(page.locator('#game-code')).toHaveText('offline-netlify-test');
});

test('a new deployed worker waits for consent and preserves the game when updating', async ({ page }, info) => {
  test.skip(process.env.SERVE_DIST !== '1' || info.project.name !== 'desktop');
  await expect(page.locator('#offline-status')).toHaveText('Disponibile offline');
  const starter = JSON.parse(await readFile(new URL('../data/starter.json', import.meta.url)));
  const first = starter.boards[0];
  const empty = Object.keys(starter.solution).find(id => {
    const [x, y] = id.split(',').map(Number);
    return !starter.givens[id] && x >= first.x && x < first.x + 9 && y >= first.y && y < first.y + 9;
  });
  await page.locator('#focus').click();
  await page.locator(`[data-cell="${empty}"]`).click();
  await page.locator('#number-pad button').filter({ hasText: new RegExp(`^${starter.solution[empty]}$`) }).click();
  const file = new URL('../dist/sw.js', import.meta.url);
  const original = await readFile(file, 'utf8');
  try {
    await writeFile(file, original.replace(/supersudoku-([a-f0-9]{16})/, 'supersudoku-update-test-$1'));
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await expect(page.locator('#update-button')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#progress-caption')).toContainText('257 / 576');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#update-button').click();
    await expect(page.locator('#progress-caption')).toContainText('257 / 576');
    await expect(page.locator('#update-button')).not.toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('supersudoku.game')));
    expect(saved.values[empty]).toBe(starter.solution[empty]);
  } finally { await writeFile(file, original); }
});
