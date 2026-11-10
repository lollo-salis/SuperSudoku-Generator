import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle } from '../src/generator.js';
import { createModel, solve } from '../src/engine.js';
import { rateDifficulty } from '../src/difficulty.js';
import { Game, serializeGame, deserializeGame } from '../src/game.js';
import { boardInfo } from '../src/layout.js';

test('each requested difficulty has a verified solution and meets its technique definition', { timeout: 60000 }, () => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const puzzle = generatePuzzle({ seed: 'levels-test', difficulty });
    const model = createModel(puzzle.boards);
    assert.equal(puzzle.difficulty, difficulty);
    assert.equal(rateDifficulty(model, puzzle.givens).level, difficulty);
    assert.equal(solve(model, puzzle.givens).unique, true);
    const basic = solve(model, puzzle.givens, { allowSearch: false, hiddenSingles: false });
    const logical = solve(model, puzzle.givens, { allowSearch: false });
    assert.equal(Boolean(basic.solutions.length), difficulty === 'easy');
    assert.equal(Boolean(logical.solutions.length), difficulty !== 'hard');
  }
});

test('custom repeated variants retain independent identities, labels, clues and saves', { timeout: 60000 }, () => {
  const variants = ['killer', 'killer', 'killer', 'classic', 'classic', 'classic', 'classic', 'classic'];
  const puzzle = generatePuzzle({ seed: 'repeated-mix', difficulty: 'easy', variants });
  const game = new Game(puzzle);
  assert.deepEqual(puzzle.boards.map(b => b.variant).sort(), [...variants].sort());
  assert.equal(new Set(puzzle.boards.map(b => b.id)).size, 8);
  assert.equal(new Set(puzzle.boards.map(b => boardInfo(b, 'en').name)).size, 8);
  const killers = puzzle.boards.filter(b => b.variant === 'killer');
  assert.equal(killers.length, 3);
  assert.ok(killers.every(b => b.cages.length));
  assert.notStrictEqual(killers[0].cages, killers[1].cages);
  assert.equal(solve(game.model, puzzle.givens).unique, true);
  assert.deepEqual(deserializeGame(serializeGame(game)).game.puzzle, puzzle);
});

test('invalid difficulty and recipes are rejected before generation', () => {
  assert.throws(() => generatePuzzle({ difficulty: 'impossible' }));
  assert.throws(() => generatePuzzle({ variants: ['classic'] }));
  assert.throws(() => generatePuzzle({ variants: Array(8).fill('unknown') }));
});
