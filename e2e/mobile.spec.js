import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const puzzle = JSON.parse(await readFile(new URL('../data/starter.json', import.meta.url)));
const board = puzzle.boards[0];
const inside = id => { const [x, y] = id.split(',').map(Number); return x >= board.x && x < board.x + 9 && y >= board.y && y < board.y + 9; };
const empty = Object.keys(puzzle.solution).find(id => inside(id) && !puzzle.givens[id]);
const given = Object.keys(puzzle.givens).find(inside);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-cell]')).toHaveCount(576);
});

test('desktop keeps its permanent controls and percentage zoom', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await expect(page.locator('#entry-panel')).toBeVisible();
  await expect(page.locator('.zoom-controls')).toBeVisible();
  await expect(page.locator('#keypad-close')).not.toBeVisible();
  await expect(page.locator('#mobile-erase')).not.toBeVisible();
  await page.locator('#zoom-in').click();
  await expect(page.locator('#zoom-fit')).toHaveText('125%');
});

test('phone opens a bottom keypad on editable cells, closes it, and protects givens', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone');
  await expect(page.locator('.zoom-controls')).not.toBeVisible();
  await expect(page.locator('#entry-panel')).not.toBeVisible();
  await page.locator(`[data-cell="${given}"]`).tap();
  await expect(page.locator('#entry-panel')).not.toBeVisible();
  await page.locator(`[data-cell="${empty}"]`).tap();
  await expect(page.locator('#entry-panel')).toBeVisible();
  const panel = await page.locator('#entry-panel').boundingBox();
  const selected = await page.locator(`[data-cell="${empty}"]`).boundingBox();
  expect(selected.y + selected.height).toBeLessThanOrEqual(panel.y + 1);
  const button = page.locator('#number-pad button').filter({ hasText: new RegExp(`^${puzzle.solution[empty]}$`) });
  const size = await button.boundingBox();
  expect(size.width).toBeGreaterThanOrEqual(44);
  expect(size.height).toBeGreaterThanOrEqual(44);
  await button.tap();
  await expect(page.locator('#progress-caption')).toContainText('257 / 576');
  await page.locator('#mobile-erase').tap();
  await expect(page.locator('#progress-caption')).toContainText('256 / 576');
  await page.locator('#keypad-close').tap();
  await expect(page.locator('#entry-panel')).not.toBeVisible();
  await page.locator(`[data-cell="${empty}"]`).tap();
  await expect(page.locator('#entry-panel')).toBeVisible();
  await page.screenshot({ path: 'artifacts/phone-keypad.png', fullPage: false });
});

test('real two-finger pinch zooms the board, drag pans, and neither selects a cell', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'phone');
  const session = await context.newCDPSession(page);
  const viewport = await page.locator('#board-viewport').boundingBox();
  const cx = viewport.x + viewport.width / 2, cy = viewport.y + Math.min(viewport.height / 2, 130);
  const fingers = distance => [{ x: cx - distance / 2, y: cy, id: 1 }, { x: cx + distance / 2, y: cy, id: 2 }];
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(70) });
  for (const distance of [80, 100, 120, 140, 160]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(distance) });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const width = await page.locator('#board-mount').evaluate(element => parseFloat(element.style.width));
  expect(width).toBeGreaterThan(180);
  await expect(page.locator('#entry-panel')).not.toBeVisible();
  await expect(page.locator('[data-cell][aria-pressed="true"]')).toHaveCount(0);
  const before = await page.locator('#board-viewport').evaluate(el => ({ x: el.scrollLeft, y: el.scrollTop }));
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 50, y: cy - 50, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = await page.locator('#board-viewport').evaluate(el => ({ x: el.scrollLeft, y: el.scrollTop }));
  expect(after.x + after.y).toBeGreaterThan(before.x + before.y);
  await expect(page.locator('#entry-panel')).not.toBeVisible();
  await page.locator('#mobile-reset').tap();
  await expect.poll(() => page.locator('#board-mount').evaluate(el => el.style.width)).toBe('100%');
  await session.detach();
});

test('phone can switch language and return to desktop width without a stuck keypad', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone');
  await page.locator('#language').selectOption('en');
  await page.locator(`[data-cell="${empty}"]`).tap();
  await expect(page.locator('#keypad-close')).toHaveAttribute('aria-label', 'Hide keypad');
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(page.locator('.zoom-controls')).toBeVisible();
  await expect(page.locator('body')).not.toHaveClass(/mobile-keypad-open/);
  await expect(page.locator('#entry-panel')).toBeVisible();
});
