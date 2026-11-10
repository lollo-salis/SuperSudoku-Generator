import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const puzzle = JSON.parse(await readFile(new URL('../data/starter.json', import.meta.url)));
const first = puzzle.boards[0];
const empty = Object.keys(puzzle.solution).find(id => {
  const [x, y] = id.split(',').map(Number);
  return !puzzle.givens[id] && x >= first.x && x < first.x + 9 && y >= first.y && y < first.y + 9;
});
const cell = page => page.locator(`[data-cell="${empty}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-cell]')).toHaveCount(576);
});

test('loads all eight boards without script errors or horizontal page overflow', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await expect(page.locator('#board-list .board-row')).toHaveCount(8);
  await expect(page.locator('#progress-caption')).toContainText('256 / 576');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  if (info.project.name === 'desktop') await expect(page.locator('.board-label')).toHaveCount(8);
  await page.screenshot({ path: `artifacts/${info.project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('rules and every visible label switch language without changing the game', async ({ page }) => {
  await page.locator('#board-list [data-rules]').first().click();
  await expect(page.locator('#dialog-body')).toContainText('sovrapposte');
  await page.locator('#dialog-done').click();
  await page.locator('#language').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#new-game')).toHaveText('New game');
  await page.locator('#board-list [data-rules]').first().click();
  await expect(page.locator('#dialog-body')).toContainText('Overlapping cells');
  await page.locator('#dialog-done').click();
  await page.reload();
  await expect(page.locator('#new-game')).toHaveText('New game');
  await expect(page.locator('#progress-caption')).toContainText('256 / 576');
});

test('wrong entries, notes, undo/redo and reload work through the real controls', async ({ page }) => {
  await page.locator('#focus').click();
  await cell(page).click();
  const wrong = puzzle.solution[empty] % 9 + 1;
  await page.locator('#number-pad button').filter({ hasText: new RegExp(`^${wrong}$`) }).click();
  await expect(page.locator('#feedback')).toHaveClass(/error/);
  await page.locator('#undo').click();
  await expect(page.locator('#feedback')).not.toHaveClass(/error/);
  await page.locator('#redo').click();
  await expect(page.locator('#feedback')).toHaveClass(/error/);
  await page.locator('#erase').click();
  await page.locator('#notes').click();
  await page.locator('#number-pad button').filter({ hasText: /^3$/ }).click();
  await expect(page.locator('.cell-note')).toHaveCount(1);
  await page.locator('#notes').click();
  await page.locator('#number-pad button').filter({ hasText: new RegExp(`^${puzzle.solution[empty]}$`) }).click();
  await expect(page.locator('.cell-note')).toHaveCount(0);
  await expect(page.locator('#feedback')).not.toHaveClass(/error/);
  await page.reload();
  await expect(page.locator('#progress-caption')).toContainText('257 / 576');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('supersudoku.game')));
  expect(saved.values[empty]).toBe(puzzle.solution[empty]);
});

test('new game is generated in a worker and cancelling preserves the current game', async ({ page }) => {
  await page.locator('#new-game').click();
  await page.locator('#seed').fill('browser-first-game');
  await page.locator('#generate-button').click();
  await expect(page.locator('#new-dialog')).not.toBeVisible({ timeout: 45000 });
  await expect(page.locator('#game-code')).toHaveText('browser-first-game');
  await expect(page.locator('[data-cell]')).toHaveCount(576);
  await page.locator('#new-game').click();
  await page.locator('#seed').fill('cancelled-game');
  await page.locator('#generate-button').click();
  await page.locator('#cancel-generation').click();
  await expect(page.locator('#game-code')).toHaveText('browser-first-game');
});

test('finishing the last cell celebrates completion; restart restores only the givens', async ({ page }) => {
  await page.addInitScript(({ puzzle, empty }) => {
    const values = { ...puzzle.solution }; delete values[empty];
    localStorage.setItem('supersudoku.game', JSON.stringify({ version: 1, puzzle, values, notes: {}, elapsed: 10 }));
  }, { puzzle, empty });
  await page.reload();
  await expect(page.locator('#progress-caption')).toContainText('575 / 576');
  await page.locator('#focus').click();
  await cell(page).click();
  await page.locator('#number-pad button').filter({ hasText: new RegExp(`^${puzzle.solution[empty]}$`) }).click();
  await expect(page.locator('#feedback')).toHaveClass(/success/);
  await expect(page.locator('#progress-value')).toHaveText('100%');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restart').click();
  await expect(page.locator('#progress-caption')).toContainText('256 / 576');
});

test('offline reload works after the initial service worker has cached the app', async ({ page, context }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-cell]')).toHaveCount(576);
  await expect(page.locator('#new-game')).toBeEnabled();
});
