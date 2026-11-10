import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generatePuzzle } from '../src/generator.js';
import { createModel, conflicts, solve } from '../src/engine.js';

test('starter has all eight real variants, visible clues and one unique solution', async () => {
  const puzzle = JSON.parse(await readFile(new URL('../data/starter.json', import.meta.url)));
  const model = createModel(puzzle.boards);
  assert.equal(model.cells.size, 576);
  assert.equal(conflicts(model, puzzle.solution).length, 0);
  assert.equal(solve(model, puzzle.givens).unique, true);
  assert.equal(Object.keys(puzzle.givens).length, 256);
  for (const board of puzzle.boards) {
    if (board.variant === 'killer') assert.equal(board.cages.reduce((n, c) => n + c.cells.length, 0), 81);
    if (board.variant === 'addition') assert.ok(board.additions.length);
    if (board.variant === 'inequality') assert.ok(board.inequalities.length);
    if (board.variant === 'consecutive') assert.ok(board.bridges.length);
    if (board.variant === 'irregular') {
      assert.ok(board.regions.some((region, i) => region !== Math.floor(i / 27) * 3 + Math.floor(i % 9 / 3)));
    }
  }
});

test('new seeds construct different valid games, including fewer starting numbers', { timeout: 60000 }, () => {
  const orders = new Set();
  for (const [seed, blanks] of [['test-new-game', 320], ['test-new-game-2', 400], ['test-new-game-3', 320]]) {
    const puzzle = generatePuzzle({ seed, blanks });
    assert.equal(puzzle.blanks, blanks);
    const model = createModel(puzzle.boards);
    assert.equal(conflicts(model, puzzle.solution).length, 0);
    assert.equal(solve(model, puzzle.givens).unique, true);
    orders.add(puzzle.boards.map(b => b.variant).join(','));
  }
  assert.equal(orders.size, 3);
});

test('addition targets are variables, including when they are not given', () => {
  const model = createModel([{ id: 'sum', x: 0, y: 0, variant: 'addition', additions: [{ cells: [[0, 0], [0, 1]], target: [0, 2] }] }]);
  const full = Object.fromEntries(Array.from({ length: 81 }, (_, i) => {
    const r = Math.floor(i / 9), c = i % 9;
    return [`${c},${r}`, (r * 3 + Math.floor(r / 3) + c) % 9 + 1];
  }));
  delete full['2,0'];
  const result = solve(model, full);
  assert.equal(result.unique, true);
  assert.equal(result.solutions[0]['2,0'], 3);
  assert.ok(conflicts(model, { '0,0': 4, '1,0': 6 }).some(r => r.type === 'sumTarget'));
});

test('absent consecutive bridges are enforced by the full board model', () => {
  const model = createModel([{ id: 'c', x: 0, y: 0, variant: 'consecutive', bridges: [[[0, 0], [0, 1]]] }]);
  assert.equal(conflicts(model, { '0,0': 2, '1,0': 3 }).length, 0);
  assert.ok(conflicts(model, { '1,0': 3, '2,0': 4 }).some(r => r.type === 'consecutive'));
  assert.ok(conflicts(model, { '0,0': 2, '1,0': 5 }).some(r => r.type === 'consecutive'));
});
