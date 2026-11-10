import { createModel, conflicts } from './engine.js';
import { VARIANTS } from './layout.js';

export class Game {
  constructor(puzzle) {
    if (puzzle?.version !== 1 || puzzle.boards?.length !== 8 ||
        new Set(puzzle.boards.map(b => b.id)).size !== 8 ||
        new Set(puzzle.boards.map(b => b.variant)).size !== 8 ||
        puzzle.boards.some(b => !Object.hasOwn(VARIANTS, b.variant))) throw new Error('Invalid puzzle');
    this.puzzle = structuredClone(puzzle);
    this.model = createModel(this.puzzle.boards);
    if (this.model.cells.size !== 576 || Object.keys(puzzle.solution).length !== 576 ||
        [...this.model.cells.keys()].some(id => !puzzle.solution[id]) ||
        conflicts(this.model, puzzle.solution).length || conflicts(this.model, puzzle.givens).length ||
        Object.entries(puzzle.givens).some(([id, n]) => n !== puzzle.solution[id])) throw new Error('Invalid puzzle solution');
    this.values = { ...puzzle.givens };
    this.notes = {};
    this.history = [];
    this.future = [];
  }

  enter(id, digit, pencil = false) {
    if (!this.model.cells.has(id) || this.puzzle.givens[id] || !Number.isInteger(digit) || digit < 0 || digit > 9) return false;
    if (pencil && this.values[id]) return false;
    const before = this.snapshot();
    if (pencil && digit) {
      const notes = new Set(this.notes[id] ?? []);
      if (!notes.delete(digit)) notes.add(digit);
      this.notes[id] = [...notes].sort();
    } else {
      if (digit) this.values[id] = digit;
      else delete this.values[id];
      delete this.notes[id];
    }
    if (JSON.stringify(before) === JSON.stringify(this.snapshot())) return false;
    this.history.push(before);
    if (this.history.length > 200) this.history.shift();
    this.future = [];
    return true;
  }

  snapshot() { return { values: { ...this.values }, notes: structuredClone(this.notes) }; }
  restore(snapshot) { this.values = { ...snapshot.values }; this.notes = structuredClone(snapshot.notes); }
  undo() {
    if (!this.history.length) return false;
    this.future.push(this.snapshot()); this.restore(this.history.pop()); return true;
  }
  redo() {
    if (!this.future.length) return false;
    this.history.push(this.snapshot()); this.restore(this.future.pop()); return true;
  }
  get completed() {
    return [...this.model.cells.keys()].every(id => this.values[id]) && !conflicts(this.model, this.values).length;
  }
  errors(mode = 'solution') {
    const errors = new Set();
    if (mode === 'off') return errors;
    if (mode === 'solution') {
      for (const [id, n] of Object.entries(this.values)) if (n !== this.puzzle.solution[id]) errors.add(id);
    } else {
      for (const rule of conflicts(this.model, this.values)) {
        for (const id of rule.cells) {
          if (!this.values[id] || this.puzzle.givens[id]) continue;
          if (rule.type !== 'unique' || rule.cells.some(other => other !== id && this.values[other] === this.values[id])) errors.add(id);
        }
      }
    }
    return errors;
  }
}

export function serializeGame(game, elapsed = 0) {
  return JSON.stringify({ version: 1, puzzle: game.puzzle, ...game.snapshot(), elapsed });
}

export function deserializeGame(text) {
  const saved = JSON.parse(text);
  if (saved.version !== 1 || !Number.isFinite(saved.elapsed) || saved.elapsed < 0) throw new Error('Invalid save');
  const game = new Game(saved.puzzle);
  for (const [id, n] of Object.entries(saved.values)) {
    if (!game.model.cells.has(id) || !Number.isInteger(n) || n < 1 || n > 9 ||
        game.puzzle.givens[id] && game.puzzle.givens[id] !== n) throw new Error('Invalid saved value');
  }
  for (const [id, notes] of Object.entries(saved.notes)) {
    if (!game.model.cells.has(id) || saved.values[id] || !Array.isArray(notes) ||
        notes.some(n => !Number.isInteger(n) || n < 1 || n > 9)) throw new Error('Invalid saved notes');
  }
  game.restore({ values: { ...game.puzzle.givens, ...saved.values }, notes: saved.notes });
  return { game, elapsed: saved.elapsed };
}
