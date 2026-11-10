import { createLayout, seededRandom, createSeed } from './layout.js';
import { cellId, createModel, conflicts, solve } from './engine.js';
import { rateDifficulty, DIFFICULTIES } from './difficulty.js';

const positions = Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9]);
const regularRegions = () => positions.map(([r, c]) => Math.floor(r / 3) * 3 + Math.floor(c / 3));
const shuffle = (items, random) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const neighbors = i => {
  const r = Math.floor(i / 9), c = i % 9;
  return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
    .filter(([a, b]) => a >= 0 && a < 9 && b >= 0 && b < 9).map(([a, b]) => a * 9 + b);
};

function connected(regions, region) {
  const members = positions.flatMap((_, i) => regions[i] === region ? [i] : []);
  const seen = new Set([members[0]]), queue = [members[0]];
  for (let i = 0; i < queue.length; i++) for (const j of neighbors(queue[i])) {
    if (regions[j] === region && !seen.has(j)) { seen.add(j); queue.push(j); }
  }
  return seen.size === 9;
}

function makeIrregular(values, random) {
  const regions = regularRegions();
  let changes = 0;
  for (let round = 0; round < 6; round++) {
    let swapped = false;
    for (const a of shuffle(positions.map((_, i) => i), random)) {
      for (const b of shuffle(positions.map((_, i) => i), random)) {
        const ra = regions[a], rb = regions[b];
        if (ra === rb || values[a] !== values[b] ||
            !neighbors(a).some(i => regions[i] === rb) || !neighbors(b).some(i => regions[i] === ra)) continue;
        [regions[a], regions[b]] = [rb, ra];
        if (connected(regions, ra) && connected(regions, rb)) { swapped = true; changes++; break; }
        [regions[a], regions[b]] = [ra, rb];
      }
      if (swapped) break;
    }
    if (!swapped) break;
  }
  return changes && regions.some((r, i) => r !== regularRegions()[i]) ? regions : null;
}

function cluesFor(board, solution, random) {
  const values = positions.map(([r, c]) => solution[cellId(board.x + c, board.y + r)]);
  if (board.variant === 'irregular') {
    board.regions = makeIrregular(values, random);
    if (!board.regions) return false;
  }
  if (board.variant === 'inequality') {
    board.inequalities = [];
    for (let a = 0; a < 81; a++) for (const b of neighbors(a)) {
      if (a < b && random() < 0.28) board.inequalities.push({
        smaller: positions[values[a] < values[b] ? a : b], larger: positions[values[a] < values[b] ? b : a],
      });
    }
  }
  if (board.variant === 'killer') {
    board.cages = [];
    const remaining = new Set(positions.map((_, i) => i));
    for (const start of shuffle([...remaining], random)) {
      if (!remaining.delete(start)) continue;
      const cage = [start], digits = new Set([values[start]]);
      const size = 2 + Math.floor(random() * 3);
      while (cage.length < size) {
        const options = shuffle([...new Set(cage.flatMap(neighbors))], random)
          .filter(i => remaining.has(i) && !digits.has(values[i]));
        if (!options.length) break;
        const i = options[0];
        cage.push(i); remaining.delete(i); digits.add(values[i]);
      }
      board.cages.push({ cells: cage.map(i => positions[i]), target: cage.reduce((s, i) => s + values[i], 0) });
    }
  }
  if (board.variant === 'consecutive') {
    board.bridges = [];
    for (let a = 0; a < 81; a++) for (const b of neighbors(a)) {
      if (a < b && Math.abs(values[a] - values[b]) === 1) board.bridges.push([positions[a], positions[b]]);
    }
  }
  if (board.variant === 'addition') {
    board.additions = [];
    const used = new Set();
    for (const i of shuffle(positions.map((_, i) => i), random)) {
      if (i < 63 && values[i] + values[i + 9] === values[i + 18] &&
          [i, i + 9, i + 18].every(j => !used.has(j))) {
        board.additions.push({ cells: [positions[i], positions[i + 9]], target: positions[i + 18] });
        for (const j of [i, i + 9, i + 18]) used.add(j);
      }
    }
    if (!board.additions.length) return false;
  }
  return true;
}

/** Every released puzzle is checked for a full valid solution and uniqueness. */
export function generatePuzzle({ seed = createSeed(), blanks = 320, difficulty, variants, onProgress = () => {} } = {}) {
  if (!Number.isInteger(blanks) || blanks < 1 || blanks > 480) throw new Error('Invalid blank count');
  if (difficulty !== undefined && !DIFFICULTIES.includes(difficulty)) throw new Error('Invalid difficulty');
  // Validate the recipe before running an expensive search.
  createLayout({ seed, variants });
  const random = seededRandom(`${seed}:digits`);
  let boards, solution;
  for (let attempt = 0; attempt < 12; attempt++) {
    onProgress({ stage: 'solution', current: attempt, total: 12 });
    boards = createLayout({ seed: `${seed}:layout:${attempt}`, variants });
    const base = boards.map(b => b.variant === 'irregular' ? { ...b, variant: 'classic' } : b);
    const result = solve(createModel(base), {}, { limit: 1, maxNodes: 5000, random });
    solution = result.solutions[0];
    if (solution && boards.every(b => cluesFor(b, solution, random))) break;
    solution = null;
  }
  if (!solution) throw new Error('Could not construct a full solution');
  const model = createModel(boards);
  if (conflicts(model, solution).length) throw new Error('Generated solution violates a rule');
  const givens = { ...solution };
  let removed = 0;
  const target = difficulty ? { easy: 300, medium: 340, hard: 380 }[difficulty] : blanks;
  let rating;
  for (const id of shuffle([...model.cells.keys()], random)) {
    const digit = givens[id];
    delete givens[id];
    const check = solve(model, givens, { maxNodes: 100 });
    if (!check.unique) { givens[id] = digit; continue; }
    const candidate = difficulty ? rateDifficulty(model, givens) : undefined;
    if (difficulty && DIFFICULTIES.indexOf(candidate.level) > DIFFICULTIES.indexOf(difficulty)) {
      givens[id] = digit; continue;
    }
    removed++; rating = candidate;
    if (removed % 16 === 0) onProgress({ stage: 'clues', current: removed, total: 576 });
    if (removed >= target && (!difficulty || rating.level === difficulty)) break;
  }
  rating ??= rateDifficulty(model, givens);
  if (difficulty && rating.level !== difficulty) {
    const error = new Error('The requested difficulty is unavailable for this seed and recipe');
    error.code = 'DIFFICULTY_UNAVAILABLE';
    throw error;
  }
  const verified = solve(model, givens, { maxNodes: 5000 });
  if (!verified.unique) throw new Error('Puzzle uniqueness could not be verified');
  return { version: 1, generatorVersion: 2, seed: String(seed), boards, givens, solution, blanks: removed, difficulty: rating.level, rating };
}
