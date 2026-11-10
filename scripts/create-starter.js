import { mkdir, writeFile } from 'node:fs/promises';
import { generatePuzzle } from '../src/generator.js';

const started = Date.now();
const puzzle = generatePuzzle({ seed: 'supersudoku-first-game-v1', onProgress: p => {
  if (p.stage === 'solution' || p.current % 64 === 0) console.log(p);
} });
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/starter.json', import.meta.url), JSON.stringify(puzzle));
console.log({ milliseconds: Date.now() - started, givens: Object.keys(puzzle.givens).length, blanks: puzzle.blanks });
