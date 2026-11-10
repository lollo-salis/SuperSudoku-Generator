import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, conflicts, solve, LAYOUT } from '../src/engine.js';

const board = { id: 'test', x: 0, y: 0, variant: 'classic' };
const completed = Object.fromEntries(Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9), c = i % 9;
  return [`${c},${r}`, (r * 3 + Math.floor(r / 3) + c) % 9 + 1];
}));

test('overlapping boards share cells and obey both sets of rules', () => {
  const model = createModel([board, { ...board, id: 'second', x: 6, y: 6 }]);
  assert.equal(model.cells.size, 153);
  assert.deepEqual(model.cells.get('6,6').boards, ['test', 'second']);
  assert.ok(conflicts(model, { '6,6': 4, '14,6': 4 }).length);
});

test('classic puzzle resolves uniquely without mutating givens', () => {
  const givens = { ...completed };
  delete givens['0,0'];
  delete givens['8,8'];
  const result = solve(createModel([board]), givens);
  assert.equal(result.unique, true);
  assert.deepEqual(result.solutions[0], completed);
  assert.equal(givens['0,0'], undefined);
});

test('invalid and contradictory givens have no solution', () => {
  const model = createModel([board]);
  for (const values of [{ '0,0': 1, '1,0': 1 }, { '0,0': 10 }, { '99,99': 1 }]) {
    assert.equal(solve(model, values).solutions.length, 0);
  }
});

test('ambiguous puzzles and interrupted searches never claim uniqueness', () => {
  const model = createModel([board]);
  const ambiguous = solve(model, {});
  assert.equal(ambiguous.solutions.length, 2);
  assert.equal(ambiguous.unique, false);
  const interrupted = solve(model, {}, { maxNodes: 1 });
  assert.equal(interrupted.exhausted, false);
  assert.equal(interrupted.unique, false);
  assert.equal(solve(model, completed, { limit: 1 }).unique, false);
});

test('diagonal and offset groups add their extra constraints', () => {
  for (const variant of ['diagonal', 'offset']) {
    const model = createModel([{ ...board, variant }]);
    const values = variant === 'diagonal' ? { '0,0': 1, '4,4': 1 } : { '0,0': 1, '3,3': 1 };
    assert.equal(conflicts(createModel([board]), values).length, 0);
    assert.ok(conflicts(model, values).length);
  }
});

test('inequalities, sums, and consecutive / absent bridges', () => {
  const model = createModel([board]);
  model.add('less', ['0,0', '1,0']);
  model.add('sum', ['0,0', '1,0'], { target: 7, unique: true });
  model.add('consecutive', ['0,0', '1,0'], { expected: true });
  assert.equal(conflicts(model, { '0,0': 3, '1,0': 4 }).length, 0);
  assert.ok(conflicts(model, { '0,0': 4, '1,0': 3 }).some(e => e.type === 'less'));
  assert.ok(conflicts(model, { '0,0': 8 }).some(e => e.type === 'sum'));
  const negative = createModel([board]);
  negative.add('consecutive', ['0,0', '1,0'], { expected: false });
  assert.ok(conflicts(negative, { '0,0': 3, '1,0': 4 }).length);
  assert.equal(conflicts(negative, { '0,0': 3, '1,0': 5 }).length, 0);
});

test('irregular regions must be supplied explicitly and be connected', () => {
  assert.throws(() => createModel([{ ...board, variant: 'irregular' }]));
  assert.throws(() => createModel([{ ...board, regions: Array(81).fill(0) }]));
  assert.throws(() => createModel([{ ...board, regions: Array.from({ length: 81 }, (_, i) => (i % 9 + Math.floor(i / 9)) % 9) }]));
});

test('reference layout forms a ring with eight shared boxes', () => {
  const model = createModel(LAYOUT.map(b => b.variant === 'irregular' ? { ...b, variant: 'classic' } : b));
  assert.equal(model.cells.size, 576);
  assert.equal([...model.cells.values()].filter(c => c.boards.length === 2).length, 72);
});
