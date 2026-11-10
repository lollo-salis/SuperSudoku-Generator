import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Game, serializeGame, deserializeGame } from '../src/game.js';

const puzzle = JSON.parse(await readFile(new URL('../data/starter.json', import.meta.url)));
const empty = Object.keys(puzzle.solution).find(id => !puzzle.givens[id]);

test('givens are protected; entering a number updates every shared board through one value', () => {
  const game = new Game(puzzle), given = Object.keys(puzzle.givens)[0];
  assert.equal(game.enter(given, 8), false);
  const shared = [...game.model.cells.values()].find(c => c.boards.length === 2 && !puzzle.givens[c.id]);
  assert.ok(game.enter(shared.id, puzzle.solution[shared.id]));
  assert.equal(game.values[shared.id], puzzle.solution[shared.id]);
  assert.equal(game.model.cells.get(shared.id).boards.length, 2);
});

test('notes, erase, undo and redo preserve state and clear redo after a new move', () => {
  const game = new Game(puzzle);
  game.enter(empty, 3, true); game.enter(empty, 5, true);
  assert.deepEqual(game.notes[empty], [3, 5]);
  game.enter(empty, puzzle.solution[empty]);
  assert.equal(game.notes[empty], undefined);
  game.undo(); assert.deepEqual(game.notes[empty], [3, 5]);
  game.redo(); assert.equal(game.values[empty], puzzle.solution[empty]);
  game.enter(empty, 0); assert.equal(game.values[empty], undefined);
  game.undo(); game.enter(empty, 7);
  assert.equal(game.future.length, 0);
});

test('solution errors are immediate, can be disabled, and disappear after correction', () => {
  const game = new Game(puzzle);
  game.enter(empty, puzzle.solution[empty] % 9 + 1);
  assert.ok(game.errors('solution').has(empty));
  assert.equal(game.errors('off').size, 0);
  game.enter(empty, puzzle.solution[empty]);
  assert.equal(game.errors('solution').size, 0);
  assert.equal(game.completed, false);
  game.values = { ...puzzle.solution };
  assert.equal(game.completed, true);
});

test('save and reload preserve entries, notes and elapsed time; damaged saves are rejected', () => {
  const game = new Game(puzzle);
  game.enter(empty, 7, true);
  const saved = serializeGame(game, 123);
  const loaded = deserializeGame(saved);
  assert.deepEqual(loaded.game.snapshot(), game.snapshot());
  assert.equal(loaded.elapsed, 123);
  const corrupt = JSON.parse(saved);
  corrupt.values[empty] = 12;
  assert.throws(() => deserializeGame(JSON.stringify(corrupt)));
  corrupt.values[empty] = 1;
  corrupt.elapsed = -1;
  assert.throws(() => deserializeGame(JSON.stringify(corrupt)));
  assert.throws(() => deserializeGame('invalid json'));
});
